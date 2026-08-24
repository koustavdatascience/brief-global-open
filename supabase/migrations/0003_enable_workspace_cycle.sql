-- Initial cycle activation: one approved, source-grounded public source.
-- Provider credentials remain private worker environment variables.

insert into public.global_approved_sources (
  name,
  source_kind,
  canonical_url,
  jurisdiction_id,
  source_language,
  is_enabled,
  fetch_config
)
select
  'U.S. Federal Register',
  'api',
  'https://www.federalregister.gov/api/v1/documents.json',
  id,
  'en',
  true,
  '{}'::jsonb
from public.jurisdictions
where code = 'USA'
on conflict (canonical_url) do update set
  is_enabled = true,
  updated_at = now();

update public.global_refresh_configuration
set is_enabled = true,
    executor_status = 'ready',
    updated_at = now()
where id = true;
