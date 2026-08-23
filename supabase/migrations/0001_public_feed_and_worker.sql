-- Brief bootstrap: anonymous read-only feed plus private server-only worker
-- records. It creates no users, schedule, external job, sample signal, or
-- publishing function.
create extension if not exists pgcrypto;

create table public.jurisdictions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2,8}$'),
  name text not null check (char_length(name) between 2 and 120),
  region text not null check (char_length(region) between 2 and 80),
  flag_emoji text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.public_signals (
  id uuid primary key default gen_random_uuid(),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  headline text not null check (char_length(headline) between 8 and 220),
  summary text not null check (char_length(summary) between 20 and 1200),
  signal_type text not null check (signal_type in ('regulation', 'consultation', 'enforcement', 'standard', 'market_access')),
  importance text not null check (importance in ('watch', 'notable', 'material')),
  canonical_url text not null check (canonical_url ~ '^https://'),
  published_at timestamptz not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index public_signals_discovery_idx on public.public_signals (is_published, published_at desc, jurisdiction_id);

alter table public.jurisdictions enable row level security;
alter table public.public_signals enable row level security;
revoke all on table public.jurisdictions, public.public_signals from anon, authenticated;
grant select on table public.jurisdictions, public.public_signals to anon, authenticated;
create policy jurisdictions_public_read on public.jurisdictions for select to anon, authenticated using (is_public = true);
create policy public_signals_read on public.public_signals for select to anon, authenticated using (is_published = true and published_at <= now());

create table public.global_refresh_configuration (
  id boolean primary key default true check (id),
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  is_enabled boolean not null default false,
  executor_status text not null default 'not_ready' check (executor_status in ('not_ready', 'ready', 'paused')),
  updated_at timestamptz not null default now()
);
insert into public.global_refresh_configuration (id) values (true) on conflict (id) do nothing;

create table public.global_approved_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 160),
  source_kind text not null check (source_kind in ('website', 'rss', 'document_feed', 'api')),
  canonical_url text not null unique check (canonical_url ~* '^https://'),
  jurisdiction_id uuid not null references public.jurisdictions(id) on delete restrict,
  source_language text not null default 'und' check (source_language ~ '^(und|[a-z]{2,3}(-[A-Z]{2})?)$'),
  is_enabled boolean not null default true,
  fetch_config jsonb not null default '{}'::jsonb check (jsonb_typeof(fetch_config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.global_refresh_runs (
  id uuid primary key default gen_random_uuid(),
  execution_key text not null unique check (char_length(execution_key) between 16 and 200),
  trigger text not null check (trigger = 'scheduled'),
  status text not null check (status in ('running', 'completed', 'failed')),
  scheduled_for timestamptz,
  source_count integer not null default 0 check (source_count >= 0),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  note text check (note is null or char_length(note) <= 1000),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  lease_expires_at timestamptz,
  worker_id text check (worker_id is null or char_length(worker_id) <= 160)
);
create index global_refresh_runs_lease_idx on public.global_refresh_runs (execution_key, lease_expires_at) where status = 'running';

create table public.global_refresh_documents (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.global_approved_sources(id) on delete cascade,
  source_document_url text not null check (source_document_url ~ '^https://'),
  official_record_url text not null check (official_record_url ~ '^https://'),
  title text not null check (char_length(title) between 2 and 500),
  published_at timestamptz,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  byte_size integer not null check (byte_size > 0 and byte_size <= 2000000),
  created_at timestamptz not null default now(),
  unique (source_id, content_sha256)
);

create table public.global_refresh_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.global_refresh_runs(id) on delete cascade,
  document_id uuid not null references public.global_refresh_documents(id) on delete cascade,
  analysis_status text not null check (analysis_status in ('accepted', 'abstained', 'failed')),
  model_id text,
  candidate_payload jsonb,
  failure_code text,
  created_at timestamptz not null default now(),
  unique (run_id, document_id),
  check ((analysis_status = 'accepted' and candidate_payload is not null and failure_code is null) or (analysis_status in ('abstained', 'failed') and candidate_payload is null))
);

alter table public.global_refresh_configuration enable row level security;
alter table public.global_approved_sources enable row level security;
alter table public.global_refresh_runs enable row level security;
alter table public.global_refresh_documents enable row level security;
alter table public.global_refresh_candidates enable row level security;
revoke all on table public.global_refresh_configuration, public.global_approved_sources, public.global_refresh_runs, public.global_refresh_documents, public.global_refresh_candidates from anon, authenticated;

create or replace function public.claim_external_global_refresh_run(
  p_execution_key text,
  p_source_count integer,
  p_scheduled_for timestamptz,
  p_worker_id text,
  p_lease_seconds integer default 900
)
returns table (run_id uuid, claimed boolean)
language plpgsql security definer set search_path = public
as $$
declare claimed_id uuid;
begin
  if char_length(p_execution_key) < 16 or char_length(p_execution_key) > 200 or p_source_count < 0 or p_lease_seconds < 60 or p_lease_seconds > 3600 then
    raise exception 'invalid external refresh claim parameters';
  end if;
  insert into public.global_refresh_runs (execution_key, trigger, status, scheduled_for, source_count, candidate_count, note, lease_expires_at, worker_id)
  values (p_execution_key, 'scheduled', 'running', p_scheduled_for, p_source_count, 0, 'External approved-source candidate analysis; no publication.', now() + make_interval(secs => p_lease_seconds), left(p_worker_id, 160))
  on conflict (execution_key) do nothing returning id into claimed_id;
  if claimed_id is not null then return query select claimed_id, true; return; end if;
  update public.global_refresh_runs set lease_expires_at = now() + make_interval(secs => p_lease_seconds), worker_id = left(p_worker_id, 160), started_at = now(), finished_at = null
  where execution_key = p_execution_key and status = 'running' and lease_expires_at < now() returning id into claimed_id;
  if claimed_id is not null then return query select claimed_id, true; return; end if;
  select id into claimed_id from public.global_refresh_runs where execution_key = p_execution_key;
  return query select claimed_id, false;
end;
$$;
revoke all on function public.claim_external_global_refresh_run(text, integer, timestamptz, text, integer) from public;
grant execute on function public.claim_external_global_refresh_run(text, integer, timestamptz, text, integer) to service_role;
