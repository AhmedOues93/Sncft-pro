-- Phase 5: persisted import drafts + publish/rollback metadata

alter table public.imports
  add column if not exists line_code text,
  add column if not exists season text,
  add column if not exists is_active boolean not null default false,
  add column if not exists previous_active_import_id uuid references public.imports(id) on delete set null;

update public.imports
set season = season_code
where season is null;

create table if not exists public.import_calendars (
  id bigserial primary key,
  import_id uuid not null references public.imports(id) on delete cascade,
  service_code text not null,
  valid_from date not null,
  valid_to date not null,
  season text not null,
  unique(import_id, service_code)
);

create table if not exists public.import_trips (
  id bigserial primary key,
  import_id uuid not null references public.imports(id) on delete cascade,
  external_trip_id text not null,
  line_code text not null,
  service_code text not null,
  train_number text not null,
  direction text not null,
  headsign text,
  valid_from date not null,
  valid_to date not null,
  unique(import_id, external_trip_id)
);

create table if not exists public.import_stop_times (
  id bigserial primary key,
  import_id uuid not null references public.imports(id) on delete cascade,
  external_trip_id text not null,
  station_name text not null,
  station_order integer not null check (station_order > 0),
  arrival_display_time text not null,
  departure_display_time text not null,
  arrival_minutes integer not null,
  departure_minutes integer not null,
  day_offset integer not null default 0,
  unique(import_id, external_trip_id, station_order)
);

create index if not exists idx_imports_line_season_active on public.imports(line_code, season, is_active);
create index if not exists idx_import_trips_import_trip on public.import_trips(import_id, external_trip_id);
create index if not exists idx_import_stop_times_import_trip_order on public.import_stop_times(import_id, external_trip_id, station_order);
create index if not exists idx_import_calendars_import_service on public.import_calendars(import_id, service_code);
