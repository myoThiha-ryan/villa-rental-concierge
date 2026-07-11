-- Booking-lifecycle automation: iCal calendar sync + scheduled guest messages.

-- Per-property iCal export URL (e.g. Airbnb calendar feed).
alter table public.properties
  add column if not exists ical_url text;

-- iCal-sourced bookings have no guest contact, so guest_id becomes optional and
-- we track the source event UID (for idempotent sync) plus any name we can glean.
alter table public.bookings
  alter column guest_id drop not null;
alter table public.bookings
  add column if not exists external_uid text;
alter table public.bookings
  add column if not exists guest_name text;

-- Idempotent upsert target for calendar sync (NULLs allowed for manual bookings).
create unique index if not exists uq_bookings_property_uid
  on public.bookings(property_id, external_uid)
  where external_uid is not null;

-- Scheduled lifecycle messages (pre-arrival, checkout reminder, review request).
create table if not exists public.scheduled_messages (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  template_key text not null,
  body text not null,
  send_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'skipped', 'cancelled')),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- Avoid duplicate schedule rows per booking + template.
create unique index if not exists uq_scheduled_booking_template
  on public.scheduled_messages(booking_id, template_key)
  where booking_id is not null;

create index if not exists idx_scheduled_due
  on public.scheduled_messages(send_at)
  where status = 'pending';

alter table public.scheduled_messages enable row level security;

-- Owners manage scheduled messages for their own properties.
create policy scheduled_messages_owner on public.scheduled_messages
  for all using (public.owns_property(property_id))
  with check (public.owns_property(property_id));
