/**
 * Simulate an inbound WhatsApp message end-to-end WITHOUT a Meta account,
 * real phone, or WhatsApp Business setup. Feeds a message straight into the
 * real handler so a guest, conversation, AI reply, and (if triggered) an
 * escalation ticket appear in the dashboard.
 *
 * The only step that is skipped is the final outbound delivery to a real
 * phone (that hits Meta's Graph API); it fails silently and is caught.
 *
 * Usage:
 *   npx tsx scripts/simulate-whatsapp.ts "where can we eat seafood tonight?"
 *   npx tsx scripts/simulate-whatsapp.ts "I want to speak to the manager" "Villa Serena (Demo)"
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { createAdminClient } from "../src/lib/supabase/admin";
import { handleInboundMessage } from "../src/lib/whatsapp/handler";

const TEST_PHONE_NUMBER_ID = "SIM_TEST_PHONE_ID";
const GUEST_PHONE = "15551234567";
const GUEST_NAME = "Test Guest";

async function main() {
  const message = process.argv[2] ?? "Where can we eat seafood tonight?";
  const propertyName = process.argv[3] ?? "Villa Serena (Demo)";

  const supabase = createAdminClient();

  // Find the target property and ensure it has a phone_number_id the handler
  // can resolve (simulating the Meta number that would be linked to it).
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, name, whatsapp_phone_number_id")
    .eq("name", propertyName)
    .single();
  if (error || !property) {
    console.error(`Property "${propertyName}" not found.`);
    process.exit(1);
  }

  const phoneNumberId = property.whatsapp_phone_number_id ?? TEST_PHONE_NUMBER_ID;
  if (!property.whatsapp_phone_number_id) {
    await supabase
      .from("properties")
      .update({ whatsapp_phone_number_id: phoneNumberId })
      .eq("id", property.id);
    console.log(`Linked test phone id "${phoneNumberId}" to ${property.name}`);
  }

  console.log(`\nGuest → ${property.name}: "${message}"`);

  await handleInboundMessage({
    supabase,
    phoneNumberId,
    from: GUEST_PHONE,
    guestName: GUEST_NAME,
    text: message,
    whatsappMessageId: `sim_${Date.now()}`,
  });

  // Read back what the pipeline produced.
  const { data: guest } = await supabase
    .from("guests")
    .select("id")
    .eq("property_id", property.id)
    .eq("whatsapp_phone", GUEST_PHONE)
    .single();

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("guest_id", guest?.id)
    .order("last_message_at", { ascending: false })
    .limit(1)
    .single();

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content, intent, confidence")
    .eq("conversation_id", convo?.id)
    .order("created_at", { ascending: false })
    .limit(2);

  const reply = messages?.find((m) => m.role === "assistant");
  console.log(`\nBot ← ${property.name}:\n${reply?.content ?? "(no reply)"}`);
  console.log(`\nintent: ${reply?.intent} | confidence: ${reply?.confidence} | conversation status: ${convo?.status}`);

  if (convo?.status === "escalated") {
    const { count } = await supabase
      .from("escalation_tickets")
      .select("*", { count: "exact", head: true })
      .eq("conversation_id", convo.id);
    console.log(`escalation tickets on this conversation: ${count}`);
  }
  console.log("\nOpen Dashboard → Conversations to see the thread.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
