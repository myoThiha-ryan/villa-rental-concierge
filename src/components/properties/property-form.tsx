"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Property } from "@/types/database";

interface PropertyFormProps {
  property?: Property;
}

export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: property?.name ?? "",
    description: property?.description ?? "",
    address: property?.address ?? "",
    city: property?.city ?? "",
    country: property?.country ?? "",
    latitude: property?.latitude?.toString() ?? "",
    longitude: property?.longitude?.toString() ?? "",
    timezone: property?.timezone ?? "UTC",
    check_in_time: property?.check_in_time ?? "15:00",
    check_out_time: property?.check_out_time ?? "11:00",
    max_guests: property?.max_guests?.toString() ?? "",
    whatsapp_phone_number_id: property?.whatsapp_phone_number_id ?? "",
    whatsapp_business_account_id: property?.whatsapp_business_account_id ?? "",
    welcome_message: property?.welcome_message ?? "",
    ai_personality: property?.ai_personality ?? "",
    active: property?.active ?? true,
  });

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...form,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      max_guests: form.max_guests ? parseInt(form.max_guests, 10) : null,
    };

    const url = property ? `/api/properties/${property.id}` : "/api/properties";
    const method = property ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save property");
      return;
    }

    toast.success(property ? "Property updated" : "Property created");
    router.push("/dashboard/properties");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(checked) => update("active", checked)}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={form.country}
              onChange={(e) => update("country", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              value={form.latitude}
              onChange={(e) => update("latitude", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="any"
              value={form.longitude}
              onChange={(e) => update("longitude", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stay details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="check_in_time">Check-in time</Label>
            <Input
              id="check_in_time"
              value={form.check_in_time}
              onChange={(e) => update("check_in_time", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="check_out_time">Check-out time</Label>
            <Input
              id="check_out_time"
              value={form.check_out_time}
              onChange={(e) => update("check_out_time", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="max_guests">Max guests</Label>
            <Input
              id="max_guests"
              type="number"
              value={form.max_guests}
              onChange={(e) => update("max_guests", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="welcome_message">Welcome message</Label>
            <Textarea
              id="welcome_message"
              placeholder="Sent to guests when they first message the bot"
              value={form.welcome_message}
              onChange={(e) => update("welcome_message", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="ai_personality">AI tone / personality notes</Label>
            <Textarea
              id="ai_personality"
              placeholder="e.g. Warm and casual, use the host's first name Maria when signing off"
              value={form.ai_personality}
              onChange={(e) => update("ai_personality", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WhatsApp integration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="whatsapp_phone_number_id">Phone number ID</Label>
            <Input
              id="whatsapp_phone_number_id"
              value={form.whatsapp_phone_number_id}
              onChange={(e) => update("whatsapp_phone_number_id", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp_business_account_id">Business account ID</Label>
            <Input
              id="whatsapp_business_account_id"
              value={form.whatsapp_business_account_id}
              onChange={(e) => update("whatsapp_business_account_id", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : property ? "Save changes" : "Create property"}
        </Button>
      </div>
    </form>
  );
}
