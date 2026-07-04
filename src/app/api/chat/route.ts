import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { runPipeline } from "@/lib/ai/pipeline";
import type { Property } from "@/types/database";
import { z } from "zod";

const testChatSchema = z.object({
  property_id: z.string().uuid(),
  message: z.string().min(1).max(2000),
  conversation_id: z.string().uuid().optional().nullable(),
});

/**
 * Dashboard test-chat endpoint. Lets the host try the concierge bot against a
 * property's real knowledge base without going through WhatsApp. Persists to a
 * conversation flagged as a test in metadata.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { property_id, message, conversation_id } = testChatSchema.parse(body);

    const { data: property, error: propErr } = await supabase
      .from("properties")
      .select("*")
      .eq("id", property_id)
      .single();
    if (propErr || !property) throw new ApiError(404, "Property not found");

    // Resolve or create a test conversation (needs a guest row for FK).
    let conversationId = conversation_id ?? null;
    if (!conversationId) {
      const { data: guest } = await supabase
        .from("guests")
        .upsert(
          { property_id, whatsapp_phone: `test-${user.id}`, whatsapp_name: "Test guest" },
          { onConflict: "property_id,whatsapp_phone" }
        )
        .select("id")
        .single();

      const { data: conv } = await supabase
        .from("conversations")
        .insert({
          property_id,
          guest_id: guest!.id,
          status: "active",
          metadata: { test: true },
        })
        .select("id")
        .single();
      conversationId = conv!.id;
    }

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "guest",
      content: message,
    });

    const result = await runPipeline({
      supabase,
      property: property as Property,
      conversationId: conversationId!,
      guestMessage: message,
    });

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: result.reply,
      intent: result.intent,
      confidence: result.confidence,
    });

    return NextResponse.json({
      data: {
        conversation_id: conversationId,
        reply: result.reply,
        intent: result.intent,
        confidence: result.confidence,
        escalated: result.escalated,
        recommendations: result.retrieval?.recommendations.map((r) => r.name) ?? [],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
