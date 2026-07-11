"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function ReplyModeToggle({
  propertyId,
  mode,
}: {
  propertyId: string;
  mode: "auto" | "draft";
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<"auto" | "draft">(mode);
  const [busy, setBusy] = useState(false);

  async function setMode(next: "auto" | "draft") {
    if (next === current || busy) return;
    setBusy(true);
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reply_mode: next }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Failed to update reply mode");
      return;
    }
    setCurrent(next);
    toast.success(next === "draft" ? "Co-pilot mode on — replies need approval" : "Auto-send mode on");
    router.refresh();
  }

  const options: { value: "auto" | "draft"; title: string; desc: string }[] = [
    { value: "auto", title: "Auto-send", desc: "The assistant replies to guests instantly." },
    { value: "draft", title: "Co-pilot", desc: "The assistant drafts replies; you approve before they send." },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reply mode</CardTitle>
        <CardDescription>
          Choose whether the assistant sends replies automatically or waits for your approval.
          Emergencies always send immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => {
          const active = current === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setMode(o.value)}
              disabled={busy}
              className={
                "rounded-lg border p-4 text-left transition-colors " +
                (active
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input hover:bg-accent")
              }
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{o.title}</span>
                {active && <span className="text-xs text-primary">Active</span>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
