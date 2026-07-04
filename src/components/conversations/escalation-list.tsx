"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EscalationRow } from "@/app/dashboard/escalations/page";

const reasonLabel: Record<string, string> = {
  emergency: "🚨 Emergency",
  complaint: "😠 Complaint",
  low_confidence: "❓ Low confidence",
  human_requested: "🙋 Human requested",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "destructive",
  in_progress: "default",
  resolved: "secondary",
  dismissed: "outline",
};

export function EscalationList({ escalations }: { escalations: EscalationRow[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: string) {
    setPendingId(id);
    const res = await fetch(`/api/escalations/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    toast.success(`Marked ${status}`);
    router.refresh();
  }

  if (escalations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        No escalations. Your bot is handling everything. 🎉
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {escalations.map((e) => {
        const guest = e.conversations?.guests;
        const isOpen = e.status === "open" || e.status === "in_progress";
        return (
          <Card key={e.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{reasonLabel[e.reason] ?? e.reason}</span>
                  <Badge variant={statusVariant[e.status] ?? "default"}>{e.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {guest?.whatsapp_name ?? guest?.whatsapp_phone ?? "Guest"} · {e.properties?.name} ·{" "}
                  {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/dashboard/conversations/${e.conversation_id}`}>
                  <Button variant="outline" size="sm">
                    View chat
                  </Button>
                </Link>
                {isOpen && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => updateStatus(e.id, "resolved")}
                      disabled={pendingId === e.id}
                    >
                      Resolve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateStatus(e.id, "dismissed")}
                      disabled={pendingId === e.id}
                    >
                      Dismiss
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
