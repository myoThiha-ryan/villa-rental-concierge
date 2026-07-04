import { createClient } from "@/lib/supabase/server";
import { EscalationList } from "@/components/conversations/escalation-list";

export interface EscalationRow {
  id: string;
  reason: string;
  status: string;
  resolution_note: string | null;
  created_at: string;
  conversation_id: string;
  properties: { name: string } | null;
  conversations: {
    guests: { whatsapp_name: string | null; whatsapp_phone: string } | null;
  } | null;
}

export default async function EscalationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("escalation_tickets")
    .select("id, reason, status, resolution_note, created_at, conversation_id, properties(name), conversations(guests(whatsapp_name, whatsapp_phone))")
    .order("created_at", { ascending: false })
    .limit(100);

  const escalations = (data ?? []) as unknown as EscalationRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Escalations</h1>
        <p className="text-sm text-muted-foreground">
          Conversations the bot flagged for a human — emergencies, complaints, or low confidence.
        </p>
      </div>
      <EscalationList escalations={escalations} />
    </div>
  );
}
