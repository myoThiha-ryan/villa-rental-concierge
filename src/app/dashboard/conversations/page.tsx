import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface ConversationRow {
  id: string;
  status: string;
  last_message_at: string;
  message_count: number;
  guests: { whatsapp_name: string | null; whatsapp_phone: string } | null;
  properties: { name: string } | null;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  escalated: "destructive",
  resolved: "secondary",
  closed: "outline",
};

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, status, last_message_at, message_count, guests(whatsapp_name, whatsapp_phone), properties(name)")
    .order("last_message_at", { ascending: false })
    .limit(100);

  const conversations = (data ?? []) as unknown as ConversationRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground">Guest chats handled by your concierge bot.</p>
      </div>

      {conversations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No conversations yet.
        </div>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/dashboard/conversations/${c.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {c.guests?.whatsapp_name ?? c.guests?.whatsapp_phone ?? "Unknown guest"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.properties?.name} · {c.message_count} messages
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.last_message_at).toLocaleString()}
                  </span>
                  <Badge variant={statusVariant[c.status] ?? "default"}>{c.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
