"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Recommendation, RecommendationCategory } from "@/types/database";

interface RecommendationFormProps {
  propertyId: string;
  recommendation?: Recommendation;
}

export function RecommendationForm({ propertyId, recommendation }: RecommendationFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<RecommendationCategory[]>([]);
  const [form, setForm] = useState({
    category_id: recommendation?.category_id ?? "",
    name: recommendation?.name ?? "",
    description: recommendation?.description ?? "",
    host_note: recommendation?.host_note ?? "",
    address: recommendation?.address ?? "",
    latitude: recommendation?.latitude?.toString() ?? "",
    longitude: recommendation?.longitude?.toString() ?? "",
    distance_from_property: recommendation?.distance_from_property?.toString() ?? "",
    estimated_travel_time: recommendation?.estimated_travel_time ?? "",
    price_level: recommendation?.price_level?.toString() ?? "",
    opening_hours: recommendation?.opening_hours ?? "",
    booking_required: recommendation?.booking_required ?? false,
    family_friendly: recommendation?.family_friendly ?? true,
    accessibility_notes: recommendation?.accessibility_notes ?? "",
    map_url: recommendation?.map_url ?? "",
    website_url: recommendation?.website_url ?? "",
    phone_number: recommendation?.phone_number ?? "",
    tags: recommendation?.tags?.join(", ") ?? "",
    priority_score: recommendation?.priority_score?.toString() ?? "5",
    active: recommendation?.active ?? true,
  });

  useEffect(() => {
    fetch("/api/recommendation-categories")
      .then((res) => res.json())
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category_id) {
      toast.error("Please select a category");
      return;
    }
    setLoading(true);

    const payload = {
      property_id: propertyId,
      category_id: form.category_id,
      name: form.name,
      description: form.description,
      host_note: form.host_note || null,
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      distance_from_property: form.distance_from_property
        ? parseFloat(form.distance_from_property)
        : null,
      estimated_travel_time: form.estimated_travel_time || null,
      price_level: form.price_level ? parseInt(form.price_level, 10) : null,
      opening_hours: form.opening_hours || null,
      booking_required: form.booking_required,
      family_friendly: form.family_friendly,
      accessibility_notes: form.accessibility_notes || null,
      map_url: form.map_url || null,
      website_url: form.website_url || null,
      phone_number: form.phone_number || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      priority_score: parseInt(form.priority_score, 10),
      active: form.active,
    };

    const url = recommendation
      ? `/api/recommendations/${recommendation.id}`
      : "/api/recommendations";
    const method = recommendation ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error ?? "Failed to save recommendation");
      return;
    }

    toast.success(recommendation ? "Recommendation updated" : "Recommendation created");
    router.push(`/dashboard/recommendations?property_id=${propertyId}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => update("category_id", v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (shown to guests)</Label>
            <Textarea
              id="description"
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host_note">Host note (private, used as AI context only)</Label>
            <Textarea
              id="host_note"
              placeholder='e.g. "Best sunset spot, avoid on weekends"'
              value={form.host_note}
              onChange={(e) => update("host_note", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              placeholder="seafood, sunset, romantic"
              value={form.tags}
              onChange={(e) => update("tags", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location &amp; travel</CardTitle>
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
            <Label htmlFor="distance_from_property">Distance from property (km)</Label>
            <Input
              id="distance_from_property"
              type="number"
              step="any"
              value={form.distance_from_property}
              onChange={(e) => update("distance_from_property", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_travel_time">Estimated travel time</Label>
            <Input
              id="estimated_travel_time"
              placeholder="10 min drive"
              value={form.estimated_travel_time}
              onChange={(e) => update("estimated_travel_time", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="map_url">Map URL</Label>
            <Input
              id="map_url"
              placeholder="https://maps.google.com/..."
              value={form.map_url}
              onChange={(e) => update("map_url", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="price_level">Price level (1-4)</Label>
            <Input
              id="price_level"
              type="number"
              min={1}
              max={4}
              value={form.price_level}
              onChange={(e) => update("price_level", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority_score">Priority score (1-10)</Label>
            <Input
              id="priority_score"
              type="number"
              min={1}
              max={10}
              value={form.priority_score}
              onChange={(e) => update("priority_score", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="opening_hours">Opening hours</Label>
            <Input
              id="opening_hours"
              placeholder="Mon-Sun 09:00-22:00"
              value={form.opening_hours}
              onChange={(e) => update("opening_hours", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone number</Label>
            <Input
              id="phone_number"
              value={form.phone_number}
              onChange={(e) => update("phone_number", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website_url">Website URL</Label>
            <Input
              id="website_url"
              value={form.website_url}
              onChange={(e) => update("website_url", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="accessibility_notes">Accessibility notes</Label>
            <Textarea
              id="accessibility_notes"
              value={form.accessibility_notes}
              onChange={(e) => update("accessibility_notes", e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="booking_required"
              checked={form.booking_required}
              onCheckedChange={(v) => update("booking_required", v)}
            />
            <Label htmlFor="booking_required">Booking required</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="family_friendly"
              checked={form.family_friendly}
              onCheckedChange={(v) => update("family_friendly", v)}
            />
            <Label htmlFor="family_friendly">Family friendly</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="active"
              checked={form.active}
              onCheckedChange={(v) => update("active", v)}
            />
            <Label htmlFor="active">Active</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : recommendation ? "Save changes" : "Add recommendation"}
        </Button>
      </div>
    </form>
  );
}
