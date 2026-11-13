-- Source-first publication and adaptive provider cycle health.
-- Source records expose official documents without presenting unverified AI claims.

alter table public.brief_cycles
  drop constraint if exists brief_cycles_status_check;

alter table public.brief_cycles
  add constraint brief_cycles_status_check
  check (status in ('running', 'completed', 'completed_with_warnings', 'source_only', 'failed'));

alter table public.brief_cycles
  add column if not exists source_record_count integer not null default 0 check (source_record_count >= 0),
  add column if not exists analysis_pending_count integer not null default 0 check (analysis_pending_count >= 0),
  add column if not exists analysis_failed_count integer not null default 0 check (analysis_failed_count >= 0);

create table public.brief_source_records (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.brief_cycles(id) on delete cascade,
  document_id uuid not null references public.global_refresh_documents(id) on delete cascade,
  jurisdiction_id uuid references public.jurisdictions(id) on delete restrict,
  source_name text not null check (char_length(source_name) between 2 and 180),
  title text not null check (char_length(title) between 8 and 500),
  official_record_url text not null check (official_record_url ~ '^https://'),
  published_at timestamptz not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('analysis_pending', 'analysis_failed', 'analysis_rejected')),
  status_reason text not null check (char_length(status_reason) between 10 and 500),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, content_sha256)
);

create index brief_source_records_public_idx
  on public.brief_source_records (is_public, published_at desc);

alter table public.brief_source_records enable row level security;
revoke all on table public.brief_source_records from anon, authenticated;
grant select on table public.brief_source_records to anon, authenticated;

create policy brief_source_records_public_read on public.brief_source_records
for select to anon, authenticated using (
  is_public = true
  and exists (
    select 1 from public.brief_cycles
    where brief_cycles.id = brief_source_records.cycle_id
      and brief_cycles.status in ('completed', 'completed_with_warnings', 'source_only')
  )
);

-- Existing public records must remain readable in every successfully materialized state.
drop policy if exists brief_cycles_public_read on public.brief_cycles;
create policy brief_cycles_public_read on public.brief_cycles
for select to anon, authenticated using (
  status in ('completed', 'completed_with_warnings', 'source_only')
);

drop policy if exists brief_changes_public_read on public.brief_changes;
create policy brief_changes_public_read on public.brief_changes
for select to anon, authenticated using (
  is_public = true
  and exists (
    select 1 from public.brief_cycles
    where brief_cycles.id = brief_changes.cycle_id
      and brief_cycles.status in ('completed', 'completed_with_warnings', 'source_only')
  )
);

drop policy if exists brief_ideas_public_read on public.brief_ideas;
create policy brief_ideas_public_read on public.brief_ideas
for select to anon, authenticated using (
  is_public = true
  and exists (
    select 1
    from public.brief_changes
    join public.brief_cycles on brief_cycles.id = brief_changes.cycle_id
    where brief_changes.id = brief_ideas.change_id
      and brief_cycles.status in ('completed', 'completed_with_warnings', 'source_only')
  )
);

drop policy if exists brief_idea_expansions_public_read on public.brief_idea_expansions;
create policy brief_idea_expansions_public_read on public.brief_idea_expansions
for select to anon, authenticated using (
  is_public = true
  and exists (
    select 1
    from public.brief_ideas
    join public.brief_changes on brief_changes.id = brief_ideas.change_id
    join public.brief_cycles on brief_cycles.id = brief_changes.cycle_id
    where brief_ideas.id = brief_idea_expansions.idea_id
      and brief_cycles.status in ('completed', 'completed_with_warnings', 'source_only')
  )
);
