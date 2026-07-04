import { getOpenAIClient, CHAT_MODEL } from "./client";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface ChatResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
}

export async function chatComplete(
  messages: ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number }
): Promise<ChatResult> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: options?.temperature ?? 0.4,
    max_tokens: options?.maxTokens ?? 500,
  });

  return {
    content: response.choices[0]?.message?.content ?? "",
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}

export async function chatCompleteJSON<T>(
  messages: ChatCompletionMessageParam[],
  options?: { temperature?: number }
): Promise<{ data: T; promptTokens: number; completionTokens: number }> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages,
    temperature: options?.temperature ?? 0,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return {
    data: JSON.parse(raw) as T,
    promptTokens: response.usage?.prompt_tokens ?? 0,
    completionTokens: response.usage?.completion_tokens ?? 0,
  };
}
