import type { SupabaseClient } from "@supabase/supabase-js";
import type { Property } from "@/types/database";
import { parseICal, isReservation } from "./parse";
import { computeLifecycleSchedule } from "@/lib/scheduling/lifecycle";

export interface SyncResult {
  fetched: number;
  reservations: number;
  bookingsUpserted: number;
  scheduled: number;
}

/**
 * Fetch a property's iCal feed, upsert its reservations as bookings, and
 * (re)generate lifecycle scheduled messages for each. iCal feeds carry no guest
 * contact, so scheduled messages are created but only delivered later to guests
 * who have opted into WhatsApp (matched at send time).
 */
export async function syncPropertyCalendar(
  supabase: SupabaseClient,
  property: Property
): Promise<SyncResult> {
  if (!property.ical_url) {
    throw new Error("Property has no iCal URL configured");
  }

  const res = await fetch(property.ical_url, { headers: { Accept: "text/calendar" } });
  if (!res.ok) throw new Error(`Failed to fetch iCal feed (${res.status})`);
  const text = await res.text();

  const events = parseICal(text);
  const reservations = events.filter(isReservation);

  let bookingsUpserted = 0;
  let scheduled = 0;

  for (const ev of reservations) {
    // Find-then-write (rather than ON CONFLICT) so this works with the partial
    // unique index and stays idempotent across re-syncs.
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("property_id", property.id)
      .eq("external_uid", ev.uid)
      .maybeSingle();

    let bookingId: string;
    if (existing) {
      bookingId = existing.id;
      await supabase
        .from("bookings")
        .update({ check_in: ev.start, check_out: ev.end, status: "confirmed" })
        .eq("id", bookingId);
    } else {
      const { data: inserted, error } = await supabase
        .from("bookings")
        .insert({
          property_id: property.id,
          check_in: ev.start,
          check_out: ev.end,
          status: "confirmed",
          source: "airbnb_ical",
          external_uid: ev.uid,
          external_id: ev.uid,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error(`Failed to insert booking ${ev.uid}`, error?.message);
        continue;
      }
      bookingId = inserted.id;
    }
    bookingsUpserted++;

    scheduled += await scheduleLifecycleForBooking(supabase, property, {
      id: bookingId,
      checkIn: ev.start,
      checkOut: ev.end,
    });
  }

  return {
    fetched: events.length,
    reservations: reservations.length,
    bookingsUpserted,
    scheduled,
  };
}

/**
 * Create pending scheduled_messages for a booking (idempotent per template).
 * Only future sends are created; past lifecycle points are skipped.
 */
export async function scheduleLifecycleForBooking(
  supabase: SupabaseClient,
  property: Property,
  booking: { id: string; checkIn: string; checkOut: string; guestId?: string | null }
): Promise<number> {
  const items = computeLifecycleSchedule(
    { checkIn: booking.checkIn, checkOut: booking.checkOut },
    {
      propertyName: property.name,
      checkInTime: property.check_in_time,
      checkOutTime: property.check_out_time,
    }
  );

  const now = Date.now();

  // Skip templates already scheduled for this booking so re-syncs don't dupe.
  const { data: existing } = await supabase
    .from("scheduled_messages")
    .select("template_key")
    .eq("booking_id", booking.id);
  const have = new Set((existing ?? []).map((r) => r.template_key));

  const rows = items
    .filter((it) => new Date(it.sendAt).getTime() > now && !have.has(it.templateKey))
    .map((it) => ({
      property_id: property.id,
      booking_id: booking.id,
      guest_id: booking.guestId ?? null,
      template_key: it.templateKey,
      body: it.body,
      send_at: it.sendAt,
      status: "pending" as const,
    }));

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("scheduled_messages").insert(rows);
  if (error) throw new Error(error.message);

  return rows.length;
}
