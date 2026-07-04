import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { z } from "zod";

const updateSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "dismissed"]),
  resolution_note: z.string().max(2000).optional().nullable(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { status, resolution_note } = updateSchema.parse(body);

    const isClosed = status === "resolved" || status === "dismissed";

    const { data, error } = await supabase
      .from("escalation_tickets")
      .update({
        status,
        resolution_note: resolution_note ?? null,
        resolved_at: isClosed ? new Date().toISOString() : null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);

    // When resolved/dismissed, return the conversation to active.
    if (isClosed && data?.conversation_id) {
      await supabase
        .from("conversations")
        .update({ status: "active" })
        .eq("id", data.conversation_id);
    }

    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
