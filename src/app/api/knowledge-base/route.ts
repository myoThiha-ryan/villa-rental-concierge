import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { knowledgeBaseEntrySchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { embedText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const propertyId = request.nextUrl.searchParams.get("property_id");
    let query = supabase
      .from("property_knowledge_base")
      .select("id, property_id, source_type, source_document_id, title, content, chunk_index, active, created_at")
      .order("created_at", { ascending: false });

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
    const parsed = knowledgeBaseEntrySchema.parse(body);

    const embedding = await embedText(
      [parsed.title, parsed.content].filter(Boolean).join(". ")
    );

    const { data, error } = await supabase
      .from("property_knowledge_base")
      .insert({
        property_id: parsed.property_id,
        source_type: parsed.source_type,
        title: parsed.title ?? null,
        content: parsed.content,
        chunk_index: 0,
        active: parsed.active,
        embedding: toVectorLiteral(embedding),
      })
      .select("id, property_id, source_type, title, content, active, created_at")
      .single();

    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const id = request.nextUrl.searchParams.get("id");
    if (!id) throw new ApiError(400, "Missing id");

    const { error } = await supabase.from("property_knowledge_base").delete().eq("id", id);
    if (error) throw new ApiError(500, error.message);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
