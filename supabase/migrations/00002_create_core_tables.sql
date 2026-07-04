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
