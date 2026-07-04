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
