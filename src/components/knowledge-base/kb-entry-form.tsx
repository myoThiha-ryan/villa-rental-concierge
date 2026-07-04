"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOURCE_TYPES = [
  { value: "manual_entry", label: "Manual entry" },
  { value: "house_rules", label: "House rules" },
  { value: "faq", label: "FAQ" },
  { value: "welcome_book", label: "Welcome book" },
];

export function KbEntryForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sourceType, setSourceType] = useState("manual_entry");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        property_id: propertyId,
        source_type: sourceType,
        title: title || null,
        content,
      }),
    });
    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save entry");
      return;
    }

    toast.success("Knowledge base entry added");
    setTitle("");
    setContent("");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add a manual entry</CardTitle>
        <CardDescription>
          Wi-Fi codes, check-in steps, local tips — anything the bot should know.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="kb-title">Title</Label>
              <Input
                id="kb-title"
                placeholder="e.g. Wi-Fi access"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={sourceType} onValueChange={(v) => setSourceType(v ?? "manual_entry")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-content">Content</Label>
            <Textarea
              id="kb-content"
              required
              rows={5}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Add entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
