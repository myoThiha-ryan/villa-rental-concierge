import type { SupabaseClient } from "@supabase/supabase-js";
import { embedText } from "@/lib/openai/embeddings";
import { toVectorLiteral } from "@/lib/openai/format";
import type { RetrievalResult, RetrievedRecommendation, RetrievedKnowledge } from "./types";

interface RetrieveOptions {
  supabase: SupabaseClient;
  propertyId: string;
  query: string;
  categoryId?: string | null;
  hasKids?: boolean;
  recommendationCount?: number;
  knowledgeCount?: number;
}

/**
 * Vector search over recommendations + knowledge base, with reranking that blends
 * semantic similarity, host priority, and guest-context signals.
 */
export async function retrieve({
  supabase,
  propertyId,
  query,
  categoryId,
  hasKids = false,
  recommendationCount = 5,
  knowledgeCount = 3,
}: RetrieveOptions): Promise<RetrievalResult> {
  const embedding = await embedText(query);
  const vectorLiteral = toVectorLiteral(embedding);

  const [recResult, kbResult] = await Promise.all([
    supabase.rpc("match_recommendations", {
      query_embedding: vectorLiteral,
      match_property_id: propertyId,
      match_category_id: categoryId ?? null,
      match_count: 10,
    }),
    supabase.rpc("match_knowledge_base", {
      query_embedding: vectorLiteral,
      match_property_id: propertyId,
      match_count: knowledgeCount,
    }),
  ]);

  const rawRecs = (recResult.data ?? []) as RetrievedRecommendation[];
  const knowledge = (kbResult.data ?? []) as RetrievedKnowledge[];

  const ranked = rerank(rawRecs, { hasKids }).slice(0, recommendationCount);

  return { recommendations: ranked, knowledge };
}

/**
 * Reranks recommendations. Base is cosine similarity (0-1). Host priority adds up
 * to +0.2, and non-family-friendly places are penalized when the guest has kids.
 */
export function rerank(
  recs: RetrievedRecommendation[],
  ctx: { hasKids: boolean }
): RetrievedRecommendation[] {
  return recs
    .map((r) => {
      let score = r.similarity;
      score += ((r.priority_score - 5) / 5) * 0.1; // priority 1-10 → -0.08..+0.1
      if (ctx.hasKids && !r.family_friendly) score -= 0.15;
      return { ...r, rank_score: score };
    })
    .sort((a, b) => (b.rank_score ?? 0) - (a.rank_score ?? 0));
}
