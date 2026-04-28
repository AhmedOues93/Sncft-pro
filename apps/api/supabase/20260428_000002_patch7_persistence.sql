-- Patch 7 production persistence additions

alter table if exists public.imports
  add column if not exists kind text check (kind in ('schedule', 'fare')),
  alter column source_filename drop not null,
  alter column source_checksum_sha256 drop not null;

update public.imports
set kind = coalesce(kind, 'schedule')
where kind is null;

create table if not exists public.import_payloads (
  import_id uuid primary key references public.imports(id) on delete cascade,
  payload_kind text not null check (payload_kind in ('schedule', 'fare')),
  payload_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.active_versions (
  key text primary key,
  import_id uuid references public.imports(id) on delete set null,
  previous_import_id uuid references public.imports(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table if exists public.fares
  add column if not exists fare_type text,
  add column if not exists sections integer,
  add column if not exists valid_from date,
  add column if not exists valid_to date;

create index if not exists idx_imports_kind_created on public.imports(kind, created_at desc);
create index if not exists idx_import_payloads_kind on public.import_payloads(payload_kind);
