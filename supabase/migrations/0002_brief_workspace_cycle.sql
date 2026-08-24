-- Brief workspace cycle: source-linked change grouping and grounded idea expansion.
-- Worker writes use service_role; browser reads only rows explicitly marked public.

create table public.brief_cycles (
  id uuid primary key default gen_random_uuid(),
  cycle_key text not null unique check (char_length(cycle_key) between 16 and 200),
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Kolkata' check (timezone = 'Asia/Kolkata'),
  status text not null check (status in ('running', 'completed', 'failed')),
  source_count integer not null default 0 check (source_count >= 0),
  change_count integer not null default 0 check (change_count >= 0),
  idea_count integer not null default 0 check (idea_count >= 0),
  note text check (note is null or char_length(note) <= 1000),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index brief_cycles_public_idx on public.brief_cycles (status, scheduled_for desc);

create table public.brief_changes (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.brief_cycles(id) on delete cascade,
  source_candidate_id uuid references public.global_refresh_candidates(id) on delete set null,
  jurisdiction_id uuid references public.jurisdictions(id) on delete restrict,
  headline text not null check (char_length(headline) between 8 and 240),
  summary text not null check (char_length(summary) between 20 and 2000),
  change_type text not null check (change_type in ('regulation', 'enforcement', 'market_access', 'guidance', 'other')),
  importance text not null check (importance in ('watch', 'notable', 'material')),
  canonical_url text not null check (canonical_url ~ '^https://'),
  published_at timestamptz not null,
  source_name text not null check (char_length(source_name) between 2 and 180),
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cycle_id, content_sha256)
);
create index brief_changes_public_idx on public.brief_changes (is_public, published_at desc, change_type);

create table public.brief_ideas (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references public.brief_changes(id) on delete cascade,
  title text not null check (char_length(title) between 8 and 220),
  summary text not null check (char_length(summary) between 20 and 1200),
  rationale text not null check (char_length(rationale) between 20 and 1600),
  confidence numeric(4,3) not null check (confidence >= 0 and confidence <= 1),
  model_id text,
  prompt_version text not null default 'idea-v1',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (change_id)
);
create index brief_ideas_public_idx on public.brief_ideas (is_public, created_at desc);

create table public.brief_idea_expansions (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.brief_ideas(id) on delete cascade,
  body_markdown text not null check (char_length(body_markdown) between 80 and 12000),
  model_id text,
  prompt_version text not null default 'expansion-v1',
  generated_at timestamptz not null default now(),
  is_public boolean not null default false,
  unique (idea_id)
);
create index brief_idea_expansions_public_idx on public.brief_idea_expansions (is_public, generated_at desc);

alter table public.brief_cycles enable row level security;
alter table public.brief_changes enable row level security;
alter table public.brief_ideas enable row level security;
alter table public.brief_idea_expansions enable row level security;
revoke all on table public.brief_cycles, public.brief_changes, public.brief_ideas, public.brief_idea_expansions from anon, authenticated;
grant select on table public.brief_cycles, public.brief_changes, public.brief_ideas, public.brief_idea_expansions to anon, authenticated;
create policy brief_cycles_public_read on public.brief_cycles for select to anon, authenticated using (status = 'completed');
create policy brief_changes_public_read on public.brief_changes for select to anon, authenticated using (is_public = true);
create policy brief_ideas_public_read on public.brief_ideas for select to anon, authenticated using (is_public = true);
create policy brief_idea_expansions_public_read on public.brief_idea_expansions for select to anon, authenticated using (is_public = true);
