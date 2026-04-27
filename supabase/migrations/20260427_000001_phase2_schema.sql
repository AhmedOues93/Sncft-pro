-- Phase 2: SNCFT Navigator Pro schema foundation
-- Postgres / Supabase SQL migration

create extension if not exists pgcrypto;

create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  season_code text not null,
  source_filename text not null,
  source_checksum_sha256 text not null,
  status text not null default 'uploaded' check (status in ('uploaded', 'validated', 'published', 'rolled_back', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  rolled_back_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_code, source_checksum_sha256)
);

create table if not exists public.lines (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  code text not null,
  name text not null,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (import_id, code)
);

create table if not exists public.stations (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  external_station_id text not null,
  name text not null,
  normalized_name text not null,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  unique (import_id, external_station_id)
);

create table if not exists public.station_aliases (
  id uuid primary key default gen_random_uuid(),
  station_id uuid not null references public.stations(id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique (station_id, normalized_alias)
);

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  service_id text not null,
  start_date date not null,
  end_date date not null,
  monday boolean not null default false,
  tuesday boolean not null default false,
  wednesday boolean not null default false,
  thursday boolean not null default false,
  friday boolean not null default false,
  saturday boolean not null default false,
  sunday boolean not null default false,
  created_at timestamptz not null default now(),
  check (start_date <= end_date),
  unique (import_id, service_id)
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  external_trip_id text not null,
  line_id uuid not null references public.lines(id) on delete restrict,
  service_id text not null,
  headsign text,
  train_number text,
  direction_id smallint check (direction_id in (0, 1)),
  created_at timestamptz not null default now(),
  unique (import_id, external_trip_id),
  foreign key (import_id, service_id) references public.calendars(import_id, service_id) on delete restrict
);

create table if not exists public.stop_times (
  id bigserial primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  station_id uuid not null references public.stations(id) on delete restrict,
  stop_sequence integer not null check (stop_sequence > 0),
  arrival_time text not null,
  departure_time text not null,
  arrival_minutes integer not null check (arrival_minutes >= 0),
  departure_minutes integer not null check (departure_minutes >= 0),
  day_offset integer not null default 0 check (day_offset >= 0),
  pickup_type smallint not null default 0,
  drop_off_type smallint not null default 0,
  unique (trip_id, stop_sequence)
);

create table if not exists public.fares (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  line_id uuid references public.lines(id) on delete restrict,
  origin_station_id uuid references public.stations(id) on delete restrict,
  destination_station_id uuid references public.stations(id) on delete restrict,
  currency text not null default 'TND',
  amount numeric(10, 3) not null check (amount >= 0),
  passenger_type text not null default 'adult',
  created_at timestamptz not null default now()
);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.imports(id) on delete restrict,
  from_station_id uuid not null references public.stations(id) on delete restrict,
  to_station_id uuid not null references public.stations(id) on delete restrict,
  min_transfer_minutes integer not null default 0 check (min_transfer_minutes >= 0),
  transfer_type text not null default 'recommended' check (transfer_type in ('recommended', 'timed', 'forbidden')),
  created_at timestamptz not null default now(),
  unique (import_id, from_station_id, to_station_id)
);

create table if not exists public.import_issues (
  id bigserial primary key,
  import_id uuid not null references public.imports(id) on delete cascade,
  severity text not null check (severity in ('error', 'warning', 'info')),
  source_file text not null,
  row_number integer,
  field_name text,
  code text not null,
  message text not null,
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Search and lookup indexes
create index if not exists idx_lines_import_id on public.lines(import_id);
create index if not exists idx_lines_code on public.lines(code);

create index if not exists idx_stations_import_external on public.stations(import_id, external_station_id);
create index if not exists idx_stations_normalized_name on public.stations(normalized_name);

create index if not exists idx_station_aliases_station_id on public.station_aliases(station_id);
create index if not exists idx_station_aliases_normalized_alias on public.station_aliases(normalized_alias);

create index if not exists idx_calendars_service_dates on public.calendars(import_id, service_id, start_date, end_date);

create index if not exists idx_trips_line_id on public.trips(line_id);
create index if not exists idx_trips_service_id on public.trips(import_id, service_id);
create index if not exists idx_trips_train_number on public.trips(train_number);

create index if not exists idx_stop_times_trip_sequence on public.stop_times(trip_id, stop_sequence);
create index if not exists idx_stop_times_station_departure on public.stop_times(station_id, departure_minutes);
create index if not exists idx_stop_times_station_arrival on public.stop_times(station_id, arrival_minutes);
create index if not exists idx_stop_times_departure_minutes on public.stop_times(departure_minutes);

create index if not exists idx_fares_lookup on public.fares(import_id, line_id, origin_station_id, destination_station_id);
create index if not exists idx_transfers_lookup on public.transfers(import_id, from_station_id, to_station_id);

create index if not exists idx_import_issues_import on public.import_issues(import_id, severity, source_file);
