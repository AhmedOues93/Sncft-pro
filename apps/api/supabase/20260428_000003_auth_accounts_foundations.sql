-- Authentication/accounts foundation for SNCFT Navigator Pro

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  employee_number text not null unique,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  role text not null default 'viewer' check (role in ('viewer', 'editor', 'publisher', 'superadmin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passenger_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  display_name text,
  email text not null unique,
  provider text not null default 'email',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.passenger_favorites (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.passenger_profiles(id) on delete cascade,
  origin_station_id text not null,
  destination_station_id text not null,
  label text,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_journeys (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.passenger_profiles(id) on delete cascade,
  origin_station_id text not null,
  destination_station_id text not null,
  departure_time text not null,
  arrival_time text not null,
  train_numbers jsonb not null default '[]'::jsonb,
  journey_payload jsonb not null default '{}'::jsonb,
  travel_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.passenger_profiles(id) on delete cascade,
  journey_payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'reserved', 'paid', 'cancelled')),
  qr_code_payload text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_profiles_role_status on public.admin_profiles(role, status);
create index if not exists idx_passenger_favorites_passenger on public.passenger_favorites(passenger_id, created_at desc);
create index if not exists idx_saved_journeys_passenger on public.saved_journeys(passenger_id, created_at desc);
create index if not exists idx_tickets_passenger_status on public.tickets(passenger_id, status);
