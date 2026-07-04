import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recommendationSchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { embedText, recommendationToEmbeddingText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const { data, error } = await supabase
      .from("recommendations")
      .select("*, recommendation_categories(id, name, icon)")
      .eq("id", id)
      .single();

    if (error) throw new ApiError(404, "Recommendation not found");
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

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
    const parsed = recommendationSchema.partial().parse(body);

    const updatePayload: Record<string, unknown> = { ...parsed };

    // Regenerate the embedding whenever content that feeds it changes.
    if (parsed.name || parsed.description || parsed.host_note || parsed.tags) {
      const { data: existing } = await supabase
        .from("recommendations")
        .select("name, description, host_note, tags")
        .eq("id", id)
        .single();

      const merged = { ...existing, ...parsed } as {
        name: string;
        description: string;
        host_note?: string | null;
        tags?: string[];
      };
      const embedding = await embedText(recommendationToEmbeddingText(merged));
      updatePayload.embedding = toVectorLiteral(embedding);
    }

    const { data, error } = await supabase
      .from("recommendations")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
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

    const { error } = await supabase.from("recommendations").delete().eq("id", id);
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
