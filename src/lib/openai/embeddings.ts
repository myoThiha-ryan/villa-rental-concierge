import { getOpenAIClient, EMBEDDING_MODEL } from "./client";

export async function embedText(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });
  return response.data.map((d) => d.embedding);
}

/** Builds the text representation of a recommendation that gets embedded for retrieval. */
export function recommendationToEmbeddingText(rec: {
  name: string;
  description: string;
  host_note?: string | null;
  tags?: string[];
}): string {
  return [rec.name, rec.description, rec.host_note, rec.tags?.join(", ")]
    .filter(Boolean)
    .join(". ");
}
