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
