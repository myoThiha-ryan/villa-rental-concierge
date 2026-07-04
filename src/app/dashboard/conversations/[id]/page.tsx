import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageThread } from "@/components/conversations/message-thread";
import type { Message } from "@/types/database";

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*, guests(whatsapp_name, whatsapp_phone, language), properties(name)")
    .eq("id", id)
    .single();

  if (!conversation) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  const guest = (conversation as { guests: { whatsapp_name: string | null; whatsapp_phone: string } | null }).guests;
  const property = (conversation as { properties: { name: string } | null }).properties;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/conversations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">
            {guest?.whatsapp_name ?? guest?.whatsapp_phone ?? "Guest"}
          </h1>
          <p className="text-sm text-muted-foreground">{property?.name}</p>
        </div>
        <Badge className="ml-auto">{conversation.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <MessageThread messages={(messages ?? []) as Message[]} />
        </CardContent>
      </Card>
    </div>
  );
}
