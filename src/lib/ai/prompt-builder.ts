import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { Property } from "@/types/database";
import { buildSystemPrompt, buildContextBlock } from "./prompts/system";
import type { RetrievalResult } from "./types";

interface BuildMessagesOptions {
  property: Property;
  retrieval: RetrievalResult;
  history: { role: "guest" | "assistant" | "host"; content: string }[];
  currentMessage: string;
}

export function buildChatMessages({
  property,
  retrieval,
  history,
  currentMessage,
}: BuildMessagesOptions): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemPrompt(property) },
    { role: "system", content: buildContextBlock(retrieval) },
  ];

  // Map stored history (guest/assistant/host) to OpenAI roles.
  for (const turn of history.slice(-10)) {
    messages.push({
      role: turn.role === "guest" ? "user" : "assistant",
      content: turn.content,
    });
  }

  messages.push({ role: "user", content: currentMessage });
  return messages;
}
