import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { houseManualSchema } from "@/lib/utils/validators";
import { ApiError, handleApiError } from "@/lib/utils/errors";
import { embedText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";
import { HOUSE_MANUAL_KEYS, HOUSE_MANUAL_LABEL_BY_KEY } from "@/lib/house-manual/sections";

/**
 * The House Manual is a curated set of operational KB entries (one per section)
 * that the AI answers from. Each section maps to a single knowledge-base row,
 * tagged with `metadata.manual_section` so edits update in place instead of
 * creating duplicates.
 */

interface ManualRow {
  id: string;
  content: string;
  metadata: { manual_section?: string } | null;
}

// GET ?property_id= — returns the saved content keyed by section.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const propertyId = request.nextUrl.searchParams.get("property_id");
    if (!propertyId) throw new ApiError(400, "Missing property_id");

    const { data, error } = await supabase
      .from("property_knowledge_base")
      .select("id, content, metadata")
      .eq("property_id", propertyId)
      .contains("metadata", { source: "house_manual" });
    if (error) throw new ApiError(500, error.message);

    const sections: Record<string, string> = {};
    for (const row of (data ?? []) as ManualRow[]) {
      const key = row.metadata?.manual_section;
      if (key) sections[key] = row.content;
    }
    return NextResponse.json({ data: { sections } });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT — upserts one KB row per non-empty section; deletes rows for cleared ones.
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new ApiError(401, "Unauthorized");

    const body = await request.json();
    const { property_id, sections } = houseManualSchema.parse(body);

    // Load existing house-manual rows so we can update/delete in place.
    const { data: existing, error: fetchErr } = await supabase
      .from("property_knowledge_base")
      .select("id, content, metadata")
      .eq("property_id", property_id)
      .contains("metadata", { source: "house_manual" });
    if (fetchErr) throw new ApiError(500, fetchErr.message);

    const existingByKey = new Map<string, ManualRow>();
    for (const row of (existing ?? []) as ManualRow[]) {
      const key = row.metadata?.manual_section;
      if (key) existingByKey.set(key, row);
    }

    let saved = 0;
    let cleared = 0;

    for (const key of HOUSE_MANUAL_KEYS) {
      if (!(key in sections)) continue;
      const content = sections[key].trim();
      const current = existingByKey.get(key);
      const label = HOUSE_MANUAL_LABEL_BY_KEY[key];

      if (!content) {
        // Cleared: remove the entry if it existed.
        if (current) {
          await supabase.from("property_knowledge_base").delete().eq("id", current.id);
          cleared++;
        }
        continue;
      }

      // Skip re-embedding if the content is unchanged.
      if (current && current.content === content) continue;

      const embedding = toVectorLiteral(await embedText(`${label}. ${content}`));

      if (current) {
        const { error } = await supabase
          .from("property_knowledge_base")
          .update({ content, embedding, title: label, updated_at: new Date().toISOString() })
          .eq("id", current.id);
        if (error) throw new ApiError(500, error.message);
      } else {
        const { error } = await supabase.from("property_knowledge_base").insert({
          property_id,
          source_type: "manual_entry",
          title: label,
          content,
          chunk_index: 0,
          active: true,
          embedding,
          metadata: { source: "house_manual", manual_section: key },
        });
        if (error) throw new ApiError(500, error.message);
      }
      saved++;
    }

    return NextResponse.json({ data: { saved, cleared } });
  } catch (error) {
    return handleApiError(error);
  }
}
