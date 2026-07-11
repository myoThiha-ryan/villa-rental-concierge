import { createClient } from "@/lib/supabase/server";
import { DraftReview, type DraftItem } from "@/components/conversations/draft-review";

interface DraftRow {
  id: string;
  content: string;
  created_at: string;
  conversation_id: string;
  conversations: {
    property_id: string;
    guest_id: string;
    properties: { name: string } | null;
    guests: { whatsapp_name: string | null; whatsapp_phone: string } | null;
  } | null;
}

export default async function DraftsPage() {
  const supabase = await createClient();

  const { data: drafts } = await supabase
    .from("messages")
    .select(
      "id, content, created_at, conversation_id, conversations(property_id, guest_id, properties(name), guests(whatsapp_name, whatsapp_phone))"
    )
    .eq("status", "draft")
    .order("created_at", { ascending: true });

  const rows = (drafts ?? []) as unknown as DraftRow[];

  // Fetch the latest guest question per conversation for context.
  const conversationIds = [...new Set(rows.map((r) => r.conversation_id))];
  const questionByConversation = new Map<string, string>();
  if (conversationIds.length > 0) {
    const { data: guestMsgs } = await supabase
      .from("messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", conversationIds)
      .eq("role", "guest")
      .order("created_at", { ascending: false });
    for (const m of guestMsgs ?? []) {
      if (!questionByConversation.has(m.conversation_id)) {
        questionByConversation.set(m.conversation_id, m.content);
      }
    }
  }

  const items: DraftItem[] = rows.map((r) => ({
    id: r.id,
    content: r.content,
    createdAt: r.created_at,
    propertyName: r.conversations?.properties?.name ?? "Unknown property",
    guestName:
      r.conversations?.guests?.whatsapp_name ??
      r.conversations?.guests?.whatsapp_phone ??
      "Guest",
    guestQuestion: questionByConversation.get(r.conversation_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Drafts</h1>
        <p className="text-sm text-muted-foreground">
          Replies your assistant prepared in co-pilot mode. Review, edit, and send.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No drafts waiting. When a property is in co-pilot mode, AI replies appear here for approval.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((d) => (
            <DraftReview key={d.id} draft={d} />
          ))}
        </div>
      )}
    </div>
  );
}
