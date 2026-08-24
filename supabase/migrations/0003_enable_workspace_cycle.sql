-- Approved source registration only. This migration intentionally leaves the
-- worker disabled. Activation requires a separately reviewed operation after
-- GitHub secrets, workflow controls, and a manual dry run are verified.

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
