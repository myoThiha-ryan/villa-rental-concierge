"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ChatTurn {
  role: "guest" | "assistant";
  content: string;
  intent?: string;
  escalated?: boolean;
}

export function TestChat({ propertyId }: { propertyId: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  async function send() {
    const message = input.trim();
    if (!message || loading) return;
    setInput("");
    setTurns((t) => [...t, { role: "guest", content: message }]);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: propertyId, message, conversation_id: conversationId }),
    });
    setLoading(false);

    if (!res.ok) {
      setTurns((t) => [...t, { role: "assistant", content: "⚠️ Error generating reply." }]);
      return;
    }

    const { data } = await res.json();
    setConversationId(data.conversation_id);
    setTurns((t) => [
      ...t,
      { role: "assistant", content: data.reply, intent: data.intent, escalated: data.escalated },
    ]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test the concierge</CardTitle>
        <CardDescription>
          Chat with your bot using this property&apos;s real knowledge base.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={scrollRef} className="h-80 space-y-3 overflow-y-auto rounded-md border bg-muted/20 p-4">
          {turns.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">
              Try: &quot;What are the best places near the villa?&quot;
            </p>
          )}
          {turns.map((turn, i) => (
            <div key={i} className={cn("flex flex-col gap-1", turn.role === "guest" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm",
                  turn.role === "guest" ? "bg-primary text-primary-foreground" : "bg-background border"
                )}
              >
                {turn.content}
              </div>
              {turn.intent && (
                <div className="flex gap-1 px-1">
                  <Badge variant="outline" className="text-[10px]">{turn.intent}</Badge>
                  {turn.escalated && <Badge variant="destructive" className="text-[10px]">escalated</Badge>}
                </div>
              )}
            </div>
          ))}
          {loading && <p className="text-sm text-muted-foreground">Concierge is typing…</p>}
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            placeholder="Type a guest message…"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
          />
          <Button onClick={send} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
