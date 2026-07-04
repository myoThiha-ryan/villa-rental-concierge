import { chatCompleteJSON } from "@/lib/openai/chat";
import { INTENT_SYSTEM_PROMPT } from "./prompts/intent";
import type { ClassificationResult, Intent } from "./types";

const VALID_INTENTS: Intent[] = [
  "recommendation",
  "property_info",
  "booking_info",
  "emergency",
  "complaint",
  "greeting",
  "other",
];

export async function classifyIntent(
  message: string,
  history: { role: string; content: string }[] = []
): Promise<{ result: ClassificationResult; promptTokens: number; completionTokens: number }> {
  const recentHistory = history
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const userContent = recentHistory
    ? `Conversation so far:\n${recentHistory}\n\nLatest guest message: "${message}"`
    : `Guest message: "${message}"`;

  const { data, promptTokens, completionTokens } = await chatCompleteJSON<ClassificationResult>(
    [
      { role: "system", content: INTENT_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    { temperature: 0 }
  );

  // Defensive normalization in case the model returns an unexpected shape.
  const intent = VALID_INTENTS.includes(data.intent) ? data.intent : "other";
  const confidence =
    typeof data.confidence === "number" ? Math.max(0, Math.min(1, data.confidence)) : 0.3;

  return {
    result: {
      intent,
      confidence,
      category_hint: data.category_hint ?? null,
      needs_clarification: data.needs_clarification ?? null,
    },
    promptTokens,
    completionTokens,
  };
}
