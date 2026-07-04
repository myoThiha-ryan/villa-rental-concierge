import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "@/types/database";
import { classifyIntent } from "./intent-classifier";
import { detectEscalation, type EscalationReason } from "./escalation";
import { retrieve } from "./retriever";
import { buildChatMessages } from "./prompt-builder";
import { chatComplete } from "@/lib/openai/chat";
import type { ClassificationResult, RetrievalResult } from "./types";

const CATEGORY_NAME_TO_ID: Record<string, string> = {};

export interface PipelineInput {
  supabase: SupabaseClient;
  property: Property;
  conversationId: string;
  guestMessage: string;
  hasKids?: boolean;
}

export interface PipelineResult {
  reply: string;
  intent: ClassificationResult["intent"];
  confidence: number;
  escalated: boolean;
  escalationReason: EscalationReason;
  retrieval: RetrievalResult | null;
  promptTokens: number;
  completionTokens: number;
}

/**
 * Core RAG pipeline. Given a guest message, classifies intent, checks for
 * escalation, retrieves context, and generates a WhatsApp-ready reply.
 * Persistence and sending are handled by the caller (webhook).
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { supabase, property, conversationId, guestMessage, hasKids } = input;

  // Load recent conversation history for context.
  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  const history = ((historyRows ?? []) as { role: "guest" | "assistant" | "host"; content: string }[])
    .reverse();

  // 1. Classify intent.
  const { result: classification, promptTokens: clsPrompt, completionTokens: clsCompletion } =
    await classifyIntent(guestMessage, history);

  let promptTokens = clsPrompt;
  let completionTokens = clsCompletion;

  // 2. Escalation check — short-circuits the AI answer for sensitive cases.
  const escalation = detectEscalation(guestMessage, classification);
  if (escalation.shouldEscalate && escalation.guestMessage) {
    return {
      reply: escalation.guestMessage,
      intent: classification.intent,
      confidence: classification.confidence,
      escalated: true,
      escalationReason: escalation.reason,
      retrieval: null,
      promptTokens,
      completionTokens,
    };
  }

  // 3. Ask a clarifying question if the request is too vague (no retrieval needed).
  if (classification.intent === "recommendation" && classification.needs_clarification) {
    return {
      reply: classification.needs_clarification,
      intent: classification.intent,
      confidence: classification.confidence,
      escalated: false,
      escalationReason: null,
      retrieval: null,
      promptTokens,
      completionTokens,
    };
  }

  // 4. Retrieve context for grounded answer (recommendations + KB).
  const categoryId = classification.category_hint
    ? await resolveCategoryId(supabase, classification.category_hint)
    : null;

  const retrieval = await retrieve({
    supabase,
    propertyId: property.id,
    query: guestMessage,
    categoryId,
    hasKids,
  });

  // 5. Generate the reply grounded in retrieved context.
  const messages = buildChatMessages({
    property,
    retrieval,
    history,
    currentMessage: guestMessage,
  });

  const completion = await chatComplete(messages, { temperature: 0.4, maxTokens: 500 });
  promptTokens += completion.promptTokens;
  completionTokens += completion.completionTokens;

  return {
    reply: completion.content.trim() || "I'm not sure about that one — let me check with the host and get back to you. 😊",
    intent: classification.intent,
    confidence: classification.confidence,
    escalated: false,
    escalationReason: null,
    retrieval,
    promptTokens,
    completionTokens,
  };
}

async function resolveCategoryId(
  supabase: SupabaseClient,
  categoryName: string
): Promise<string | null> {
  if (CATEGORY_NAME_TO_ID[categoryName]) return CATEGORY_NAME_TO_ID[categoryName];

  const { data } = await supabase
    .from("recommendation_categories")
    .select("id, name")
    .eq("name", categoryName)
    .maybeSingle();

  if (data?.id) {
    CATEGORY_NAME_TO_ID[categoryName] = data.id;
    return data.id;
  }
  return null;
}
