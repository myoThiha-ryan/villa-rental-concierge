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
