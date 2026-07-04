import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { embedText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";
import { z } from "zod";

const searchSchema = z.object({
  property_id: z.string().uuid(),
  query: z.string().min(1).max(1000),
  category_id: z.string().uuid().optional().nullable(),
  match_count: z.number().int().min(1).max(20).default(10),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { property_id, query, category_id, match_count } = searchSchema.parse(body);

    const embedding = await embedText(query);

    const { data, error } = await supabase.rpc("match_recommendations", {
      query_embedding: toVectorLiteral(embedding),
      match_property_id: property_id,
      match_category_id: category_id ?? null,
      match_count,
    });

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
