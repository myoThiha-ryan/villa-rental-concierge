"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function IcalSettings({
  propertyId,
  icalUrl,
}: {
  propertyId: string;
  icalUrl: string | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(icalUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ical_url: url || null }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("Failed to save iCal URL");
      return;
    }
    toast.success("iCal URL saved");
    router.refresh();
  }

  async function syncNow() {
    setSyncing(true);
    const res = await fetch(`/api/properties/${propertyId}/sync-ical`, { method: "POST" });
    setSyncing(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(body.error ?? "Sync failed");
      return;
    }
    const d = body.data;
    toast.success(
      `Synced ${d.reservations} reservation${d.reservations === 1 ? "" : "s"} · ${d.scheduled} messages scheduled`
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking calendar (iCal)</CardTitle>
        <CardDescription>
          Paste your Airbnb listing&apos;s calendar export URL to sync booking dates and
          auto-schedule pre-arrival, checkout, and review messages. Never scraped — official
          iCal only. Guests receive these once they message your WhatsApp.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="ical-url">iCal export URL</Label>
          <Input
            id="ical-url"
            placeholder="https://www.airbnb.com/calendar/ical/12345.ics?s=…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save URL"}
          </Button>
          <Button onClick={syncNow} disabled={syncing || !icalUrl}>
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
        {!icalUrl && (
          <p className="text-xs text-muted-foreground">Save a URL first, then sync.</p>
        )}
      </CardContent>
    </Card>
  );
}
