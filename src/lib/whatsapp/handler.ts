import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "@/types/database";
import { runPipeline } from "@/lib/ai/pipeline";
import { sendWhatsAppText } from "./client";

interface HandleMessageInput {
  supabase: SupabaseClient;
  phoneNumberId: string;
  from: string;
  guestName: string | null;
  text: string;
  whatsappMessageId: string;
}

/**
 * Full handling of one inbound WhatsApp text message:
 * resolve property + guest + conversation, persist, run AI, persist reply,
 * send via WhatsApp, log analytics, and open escalation tickets when needed.
 * Designed to run AFTER the webhook has already returned 200 (fire-and-forget).
 */
export async function handleInboundMessage({
  supabase,
  phoneNumberId,
  from,
  guestName,
  text,
  whatsappMessageId,
}: HandleMessageInput): Promise<void> {
  // 1. Resolve the property by WhatsApp phone number id.
  const { data: property } = await supabase
    .from("properties")
    .select("*")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .eq("active", true)
    .maybeSingle();

  if (!property) {
    console.error(`No active property for phone_number_id ${phoneNumberId}`);
    return;
  }
  const prop = property as Property;

  // 2. Deduplicate by WhatsApp message id.
  const { data: existing } = await supabase
    .from("messages")
    .select("id")
    .eq("whatsapp_message_id", whatsappMessageId)
    .maybeSingle();
  if (existing) return;

  // 3. Find or create the guest.
  const { data: guest } = await supabase
    .from("guests")
    .upsert(
      {
        property_id: prop.id,
        whatsapp_phone: from,
        whatsapp_name: guestName,
      },
      { onConflict: "property_id,whatsapp_phone", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (!guest) {
    console.error("Failed to upsert guest");
    return;
  }

  // 4. Find or create an active conversation.
  let conversationId: string;
  const { data: activeConv } = await supabase
    .from("conversations")
    .select("id")
    .eq("guest_id", guest.id)
    .eq("status", "active")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeConv) {
    conversationId = activeConv.id;
  } else {
    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert({ property_id: prop.id, guest_id: guest.id, status: "active" })
      .select("id")
      .single();
    if (error || !newConv) {
      console.error("Failed to create conversation", error);
      return;
    }
    conversationId = newConv.id;
  }

  // 5. Persist the inbound guest message.
  const { data: guestMsg } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role: "guest",
      content: text,
      whatsapp_message_id: whatsappMessageId,
    })
    .select("id")
    .single();

  await logEvent(supabase, prop.id, conversationId, "message_received", {});

  // 6. Run the AI pipeline.
  let result;
  try {
    result = await runPipeline({
      supabase,
      property: prop,
      conversationId,
      guestMessage: text,
    });
  } catch (err) {
    console.error("Pipeline error", err);
    result = {
      reply: "Sorry, I'm having a little trouble right now. The host has been notified and will follow up. 🙏",
      intent: "other" as const,
      confidence: 0,
      escalated: true,
      escalationReason: "low_confidence" as const,
      retrieval: null,
      promptTokens: 0,
      completionTokens: 0,
    };
  }

  // In co-pilot mode the host reviews replies before they go out. Escalations
  // always send immediately (safety) so the guest is never left waiting.
  const shouldDraft = prop.reply_mode === "draft" && !result.escalated;

  // 7. Persist the assistant reply (as a pending draft in co-pilot mode).
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: result.reply,
    intent: result.intent,
    confidence: result.confidence,
    status: shouldDraft ? "draft" : "sent",
    retrieved_context: result.retrieval
      ? { recommendations: result.retrieval.recommendations.map((r) => r.name) }
      : null,
    tokens_used: {
      prompt_tokens: result.promptTokens,
      completion_tokens: result.completionTokens,
    },
  });

  // 8. Update conversation counters + status.
  await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
      status: result.escalated ? "escalated" : "active",
    })
    .eq("id", conversationId);

  // 9. Create an escalation ticket if needed.
  if (result.escalated && result.escalationReason) {
    await supabase.from("escalation_tickets").insert({
      conversation_id: conversationId,
      property_id: prop.id,
      reason: result.escalationReason,
      trigger_message_id: guestMsg?.id ?? null,
      status: "open",
    });
    await logEvent(supabase, prop.id, conversationId, "escalation", {
      reason: result.escalationReason,
    });
  }

  await logEvent(supabase, prop.id, conversationId, shouldDraft ? "reply_drafted" : "message_sent", {
    intent: result.intent,
    recommendation_count: result.retrieval?.recommendations.length ?? 0,
  });

  // 10. Send the reply via WhatsApp — unless it's held for host approval.
  if (shouldDraft) return;
  try {
    await sendWhatsAppText({ phoneNumberId, to: from, body: result.reply });
  } catch (err) {
    console.error("Failed to send WhatsApp reply", err);
  }
}

async function logEvent(
  supabase: SupabaseClient,
  propertyId: string,
  conversationId: string,
  eventType: string,
  data: Record<string, unknown>
) {
  await supabase.from("analytics_events").insert({
    property_id: propertyId,
    conversation_id: conversationId,
    event_type: eventType,
    event_data: data,
  });
}
