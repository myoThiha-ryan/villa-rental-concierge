import type { SupabaseClient } from "@supabase/supabase-js";
import { sendWhatsAppText } from "@/lib/whatsapp/client";

export interface RunResult {
  due: number;
  sent: number;
  skipped: number;
}

interface DueRow {
  id: string;
  body: string;
  guest_id: string | null;
  property_id: string;
  properties: { whatsapp_phone_number_id: string | null } | null;
  guests: { whatsapp_phone: string } | null;
}

/**
 * Deliver scheduled messages whose time has come. A message can only be sent if
 * it has a reachable guest (a WhatsApp phone) and the property has a configured
 * number; otherwise it is marked 'skipped' (iCal bookings with no opted-in guest).
 */
export async function runDueScheduledMessages(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<RunResult> {
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select(
      "id, body, guest_id, property_id, properties(whatsapp_phone_number_id), guests(whatsapp_phone)"
    )
    .eq("status", "pending")
    .lte("send_at", now.toISOString())
    .order("send_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as DueRow[];
  let sent = 0;
  let skipped = 0;

  for (const row of rows) {
    const phoneNumberId = row.properties?.whatsapp_phone_number_id;
    const to = row.guests?.whatsapp_phone;

    if (!phoneNumberId || !to) {
      await supabase
        .from("scheduled_messages")
        .update({ status: "skipped" })
        .eq("id", row.id);
      skipped++;
      continue;
    }

    try {
      await sendWhatsAppText({ phoneNumberId, to, body: row.body });
    } catch (err) {
      console.error(`Failed to send scheduled message ${row.id}`, err);
      // Leave as pending to retry on the next run.
      continue;
    }

    await supabase
      .from("scheduled_messages")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", row.id);
    sent++;
  }

  return { due: rows.length, sent, skipped };
}
