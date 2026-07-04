import { chunkText } from "./chunker";
import { embedBatch } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";
import type { SupabaseClient } from "@supabase/supabase-js";

interface IngestOptions {
  supabase: SupabaseClient;
  propertyId: string;
  text: string;
  sourceType: "welcome_book" | "house_rules" | "faq" | "manual_entry" | "pdf";
  sourceDocumentId?: string;
  title?: string;
}

/**
 * Chunks raw text, embeds each chunk, and stores rows in property_knowledge_base.
 * Returns the number of chunks written.
 */
export async function ingestText({
  supabase,
  propertyId,
  text,
  sourceType,
  sourceDocumentId,
  title,
}: IngestOptions): Promise<number> {
  const chunks = chunkText(text);
  if (chunks.length === 0) return 0;

  const embeddings = await embedBatch(chunks.map((c) => c.content));

  const rows = chunks.map((chunk, i) => ({
    property_id: propertyId,
    source_type: sourceType,
    source_document_id: sourceDocumentId ?? null,
    title: title ?? null,
    content: chunk.content,
    chunk_index: chunk.index,
    embedding: toVectorLiteral(embeddings[i]),
  }));

  const { error } = await supabase.from("property_knowledge_base").insert(rows);
  if (error) throw new Error(error.message);

  return rows.length;
}
