-- Brief workspace topics: subject-area classification kept separate from policy action type.

alter table public.brief_changes
  add column if not exists topics text[] not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'brief_changes_topics_valid'
      and conrelid = 'public.brief_changes'::regclass
  ) then
    alter table public.brief_changes
      add constraint brief_changes_topics_valid
      check (
        cardinality(topics) between 0 and 2
        and topics <@ array[
          'technology_ai',
          'financial_markets_crypto',
          'corporate_business',
          'healthcare_life_sciences',
          'trade_supply_chains',
          'labour_immigration',
          'tax_benefits',
          'environment_materials'
        ]::text[]
      );
  end if;
end $$;

create index if not exists brief_changes_topics_idx
  on public.brief_changes using gin (topics);
