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
