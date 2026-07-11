"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HOUSE_MANUAL_SECTIONS } from "@/lib/house-manual/sections";

export function HouseManualForm({
  propertyId,
  initialSections,
}: {
  propertyId: string;
  initialSections: Record<string, string>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState<Record<string, string>>(() =>
    Object.fromEntries(HOUSE_MANUAL_SECTIONS.map((s) => [s.key, initialSections[s.key] ?? ""]))
  );

  const filledCount = HOUSE_MANUAL_SECTIONS.filter((s) => sections[s.key]?.trim()).length;

  function update(key: string, value: string) {
    setSections((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setLoading(true);
    const res = await fetch("/api/knowledge-base/house-manual", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_id: propertyId, sections }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Failed to save the house manual");
      return;
    }

    const { data } = await res.json();
    toast.success(
      `House manual saved${data?.saved ? ` — ${data.saved} section${data.saved === 1 ? "" : "s"} updated` : ""}`
    );
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>House manual</CardTitle>
            <CardDescription>
              Fill in the questions guests ask most. The assistant answers from these
              automatically, so you stop repeating yourself. Leave a section blank to skip it.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {filledCount}/{HOUSE_MANUAL_SECTIONS.length} filled
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {HOUSE_MANUAL_SECTIONS.map((section) => (
          <div key={section.key} className="space-y-2">
            <Label htmlFor={`hm-${section.key}`}>{section.label}</Label>
            <Textarea
              id={`hm-${section.key}`}
              placeholder={section.placeholder}
              value={sections[section.key] ?? ""}
              onChange={(e) => update(section.key, e.target.value)}
              rows={3}
            />
          </div>
        ))}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving…" : "Save house manual"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
