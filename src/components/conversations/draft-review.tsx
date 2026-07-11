"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface DraftItem {
  id: string;
  content: string;
  createdAt: string;
  propertyName: string;
  guestName: string;
  guestQuestion: string | null;
}

export function DraftReview({ draft }: { draft: DraftItem }) {
  const router = useRouter();
  const [content, setContent] = useState(draft.content);
  const [busy, setBusy] = useState(false);

  async function approve() {
    setBusy(true);
    const res = await fetch(`/api/drafts/${draft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content !== draft.content ? { content } : {}),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to send");
      return;
    }
    toast.success("Reply sent");
    router.refresh();
  }

  async function discard() {
    setBusy(true);
    const res = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Failed to discard");
      return;
    }
    toast.success("Draft discarded");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">
            {draft.guestName} · {draft.propertyName}
          </CardTitle>
          <Badge variant="secondary">Draft</Badge>
        </div>
        {draft.guestQuestion && (
          <p className="text-sm text-muted-foreground">
            Guest asked: <span className="italic">“{draft.guestQuestion}”</span>
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="text-sm"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={discard} disabled={busy}>
            Discard
          </Button>
          <Button onClick={approve} disabled={busy || !content.trim()}>
            {busy ? "Sending…" : content !== draft.content ? "Edit & send" : "Approve & send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
