import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recommendationSchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { embedText, recommendationToEmbeddingText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const propertyId = request.nextUrl.searchParams.get("property_id");
    let query = supabase
      .from("recommendations")
      .select("*, recommendation_categories(id, name, icon)")
      .order("priority_score", { ascending: false });

    if (propertyId) query = query.eq("property_id", propertyId);

    const { data, error } = await query;
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const parsed = recommendationSchema.parse(body);

    const embedding = await embedText(recommendationToEmbeddingText(parsed));

    const { data, error } = await supabase
      .from("recommendations")
      .insert({ ...parsed, embedding: toVectorLiteral(embedding) })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
