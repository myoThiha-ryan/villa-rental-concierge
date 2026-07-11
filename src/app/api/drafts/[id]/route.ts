import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { draftActionSchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

/**
 * Co-pilot draft actions.
 * PUT    — approve (optionally with edited content): send via WhatsApp, mark sent.
 * DELETE — discard: mark the draft as discarded so it leaves the review queue.
 */

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json().catch(() => ({}));
    const { content } = draftActionSchema.parse(body);

    // Load the draft with the routing info needed to deliver it. RLS ensures the
    // host can only touch their own property's messages.
    const { data: draft, error: draftErr } = await supabase
      .from("messages")
      .select("id, status, content, conversation_id, conversations(property_id, guest_id)")
      .eq("id", id)
      .single();
    if (draftErr || !draft) throw new ApiError(404, "Draft not found");
    if (draft.status !== "draft") throw new ApiError(409, "This reply is no longer a draft");

    const conversation = draft.conversations as unknown as {
      property_id: string;
      guest_id: string;
    };

    const [{ data: property }, { data: guest }] = await Promise.all([
      supabase
        .from("properties")
        .select("whatsapp_phone_number_id")
        .eq("id", conversation.property_id)
        .single(),
      supabase
        .from("guests")
        .select("whatsapp_phone")
        .eq("id", conversation.guest_id)
        .single(),
    ]);

    const finalContent = content ?? draft.content;

    // Deliver. Send failures are logged but don't block marking the reply sent,
    // mirroring the inbound handler (and keeping local testing frictionless).
    if (property?.whatsapp_phone_number_id && guest?.whatsapp_phone) {
      try {
        await sendWhatsAppText({
          phoneNumberId: property.whatsapp_phone_number_id,
          to: guest.whatsapp_phone,
          body: finalContent,
        });
      } catch (err) {
        console.error("Failed to send approved draft", err);
      }
    }

    const { data, error } = await supabase
      .from("messages")
      .update({ content: finalContent, status: "sent" })
      .eq("id", id)
      .select("id, content, status")
      .single();
    if (error) throw new ApiError(500, error.message);

    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", draft.conversation_id);

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const { error } = await supabase
      .from("messages")
      .update({ status: "discarded" })
      .eq("id", id)
      .eq("status", "draft");
    if (error) throw new ApiError(500, error.message);

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
