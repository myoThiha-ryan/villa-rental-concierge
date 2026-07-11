
-- ========================================
-- 00001_enable_extensions.sql
-- ========================================

create extension if not exists "vector";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ========================================
-- 00002_create_core_tables.sql
-- ========================================

-- users: extends Supabase auth.users
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'manager', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- properties
create table public.properties (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  address text,
  city text,
  country text,
  latitude double precision,
  longitude double precision,
  timezone text not null default 'UTC',
  check_in_time text default '15:00',
  check_out_time text default '11:00',
  max_guests integer,
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  welcome_message text,
  ai_personality text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_properties_owner on public.properties(owner_id);
create index idx_properties_whatsapp_phone on public.properties(whatsapp_phone_number_id);

-- guests
create table public.guests (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  whatsapp_phone text not null,
  whatsapp_name text,
  full_name text,
  email text,
  language text default 'en',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, whatsapp_phone)
);

create index idx_guests_property on public.guests(property_id);

-- bookings
create table public.bookings (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  check_in date not null,
  check_out date not null,
  num_guests integer,
  status text not null default 'confirmed' check (status in ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
  source text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bookings_property on public.bookings(property_id);
create index idx_bookings_guest on public.bookings(guest_id);

-- ========================================
-- 00003_create_ai_tables.sql
-- ========================================

-- recommendation_categories
create table public.recommendation_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- uploaded_documents (created before knowledge base since KB references it)
create table public.uploaded_documents (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size integer,
  storage_path text not null,
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'completed', 'failed')),
  chunk_count integer default 0,
  error_message text,
  uploaded_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

create index idx_documents_property on public.uploaded_documents(property_id);

-- recommendations
create table public.recommendations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  category_id uuid not null references public.recommendation_categories(id),
  name text not null,
  description text not null,
  host_note text,
  address text,
  latitude double precision,
  longitude double precision,
  distance_from_property double precision,
  estimated_travel_time text,
  price_level integer check (price_level between 1 and 4),
  opening_hours text,
  booking_required boolean default false,
  family_friendly boolean default true,
  accessibility_notes text,
  map_url text,
  website_url text,
  phone_number text,
  tags text[] default '{}',
  priority_score integer not null default 5 check (priority_score between 1 and 10),
  embedding vector(1536),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_recommendations_embedding on public.recommendations
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_recommendations_property on public.recommendations(property_id);
create index idx_recommendations_category on public.recommendations(category_id);
create index idx_recommendations_tags on public.recommendations using gin(tags);

-- property_knowledge_base
create table public.property_knowledge_base (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_type text not null check (source_type in ('welcome_book', 'house_rules', 'faq', 'manual_entry', 'pdf')),
  source_document_id uuid references public.uploaded_documents(id) on delete set null,
  title text,
  content text not null,
  chunk_index integer not null default 0,
  embedding vector(1536),
  metadata jsonb default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_kb_embedding on public.property_knowledge_base
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_kb_property on public.property_knowledge_base(property_id);

-- ========================================
-- 00004_create_messaging_tables.sql
-- ========================================

-- conversations
create table public.conversations (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'escalated', 'resolved', 'closed')),
  started_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  message_count integer not null default 0,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_conversations_property on public.conversations(property_id);
create index idx_conversations_guest on public.conversations(guest_id);
create index idx_conversations_status on public.conversations(status);

-- messages
create table public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('guest', 'assistant', 'host')),
  content text not null,
  whatsapp_message_id text,
  intent text,
  confidence double precision,
  retrieved_context jsonb,
  tokens_used jsonb,
  created_at timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id);
create index idx_messages_whatsapp_id on public.messages(whatsapp_message_id);

-- escalation_tickets
create table public.escalation_tickets (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id),
  property_id uuid not null references public.properties(id),
  reason text not null,
  trigger_message_id uuid references public.messages(id),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'resolved', 'dismissed')),
  assigned_to uuid references public.users(id),
  resolution_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index idx_escalations_property on public.escalation_tickets(property_id);
create index idx_escalations_status on public.escalation_tickets(status);

-- ========================================
-- 00005_create_analytics_tables.sql
-- ========================================

-- analytics_events
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  event_type text not null,
  event_data jsonb default '{}',
  conversation_id uuid references public.conversations(id),
  created_at timestamptz not null default now()
);

create index idx_analytics_property_type on public.analytics_events(property_id, event_type);
create index idx_analytics_created on public.analytics_events(created_at);

-- integration_settings
create table public.integration_settings (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references public.properties(id) on delete cascade,
  provider text not null,
  config jsonb not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(property_id, provider)
);

create index idx_integration_property on public.integration_settings(property_id);

-- ========================================
-- 00006_row_level_security.sql
-- ========================================

-- Helper: is the current user the owner of this property?
create or replace function public.owns_property(p_property_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = auth.uid()
  );
$$;

-- users
alter table public.users enable row level security;
create policy "users can read own row" on public.users
  for select using (id = auth.uid());
create policy "users can update own row" on public.users
  for update using (id = auth.uid());

-- properties
alter table public.properties enable row level security;
create policy "owners manage own properties" on public.properties
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- guests
alter table public.guests enable row level security;
create policy "owners manage guests of own properties" on public.guests
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- bookings
alter table public.bookings enable row level security;
create policy "owners manage bookings of own properties" on public.bookings
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- recommendation_categories (global read-only reference data)
alter table public.recommendation_categories enable row level security;
create policy "anyone authenticated can read categories" on public.recommendation_categories
  for select using (auth.role() = 'authenticated');

-- recommendations
alter table public.recommendations enable row level security;
create policy "owners manage recommendations of own properties" on public.recommendations
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- property_knowledge_base
alter table public.property_knowledge_base enable row level security;
create policy "owners manage kb of own properties" on public.property_knowledge_base
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- uploaded_documents
alter table public.uploaded_documents enable row level security;
create policy "owners manage documents of own properties" on public.uploaded_documents
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- conversations
alter table public.conversations enable row level security;
create policy "owners view conversations of own properties" on public.conversations
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- messages (joins through conversations)
alter table public.messages enable row level security;
create policy "owners view messages of own conversations" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.owns_property(c.property_id)
    )
  ) with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and public.owns_property(c.property_id)
    )
  );

-- escalation_tickets
alter table public.escalation_tickets enable row level security;
create policy "owners manage escalations of own properties" on public.escalation_tickets
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- analytics_events
alter table public.analytics_events enable row level security;
create policy "owners view analytics of own properties" on public.analytics_events
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- integration_settings
alter table public.integration_settings enable row level security;
create policy "owners manage integration settings of own properties" on public.integration_settings
  for all using (public.owns_property(property_id)) with check (public.owns_property(property_id));

-- Auto-create public.users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========================================
-- 00007_seed_categories.sql
-- ========================================

insert into public.recommendation_categories (name, icon, display_order) values
  ('restaurant', '🍽️', 1),
  ('cafe', '☕', 2),
  ('bar', '🍹', 3),
  ('beach', '🏖️', 4),
  ('activity', '🎯', 5),
  ('shopping', '🛍️', 6),
  ('transport', '🚕', 7),
  ('emergency', '🚨', 8),
  ('attraction', '📍', 9),
  ('wellness', '💆', 10);

-- RPC: vector similarity search over recommendations, scoped to a property
create or replace function public.match_recommendations(
  query_embedding vector(1536),
  match_property_id uuid,
  match_category_id uuid default null,
  match_count int default 10
)
returns table (
  id uuid,
  name text,
  description text,
  host_note text,
  category_id uuid,
  address text,
  distance_from_property double precision,
  estimated_travel_time text,
  price_level int,
  opening_hours text,
  booking_required boolean,
  family_friendly boolean,
  map_url text,
  website_url text,
  phone_number text,
  tags text[],
  priority_score int,
  similarity double precision
)
language sql stable
as $$
  select
    r.id, r.name, r.description, r.host_note, r.category_id, r.address,
    r.distance_from_property, r.estimated_travel_time, r.price_level,
    r.opening_hours, r.booking_required, r.family_friendly,
    r.map_url, r.website_url, r.phone_number, r.tags, r.priority_score,
    1 - (r.embedding <=> query_embedding) as similarity
  from public.recommendations r
  where r.property_id = match_property_id
    and r.active = true
    and r.embedding is not null
    and (match_category_id is null or r.category_id = match_category_id)
  order by r.embedding <=> query_embedding
  limit match_count;
$$;

-- RPC: vector similarity search over knowledge base, scoped to a property
create or replace function public.match_knowledge_base(
  query_embedding vector(1536),
  match_property_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  title text,
  content text,
  source_type text,
  similarity double precision
)
language sql stable
as $$
  select
    k.id, k.title, k.content, k.source_type,
    1 - (k.embedding <=> query_embedding) as similarity
  from public.property_knowledge_base k
  where k.property_id = match_property_id
    and k.active = true
    and k.embedding is not null
  order by k.embedding <=> query_embedding
  limit match_count;
$$;

-- ========================================
-- 00008_copilot_mode.sql
-- ========================================

-- Co-pilot (human-in-the-loop) mode.
-- Hosts can choose whether the assistant sends replies automatically or drafts
-- them for approval first.

-- Per-property reply mode: 'auto' sends immediately, 'draft' holds for approval.
alter table public.properties
  add column if not exists reply_mode text not null default 'auto'
  check (reply_mode in ('auto', 'draft'));

-- Assistant messages can be pending approval ('draft'), delivered ('sent'),
-- or dismissed by the host ('discarded'). Existing rows default to 'sent'.
alter table public.messages
  add column if not exists status text not null default 'sent'
  check (status in ('draft', 'sent', 'discarded'));

-- Fast lookup of pending drafts for the review queue.
create index if not exists idx_messages_draft
  on public.messages(conversation_id)
  where status = 'draft';

-- ========================================
-- 00009_lifecycle_automation.sql
-- ========================================

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
