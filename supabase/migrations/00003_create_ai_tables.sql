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
