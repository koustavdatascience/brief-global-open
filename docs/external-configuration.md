# External configuration

Brief’s public web service needs only the public Supabase connection values at runtime: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. These must be set in the chosen host’s secret/configuration interface; they are not committed to this repository.

The same-origin public API does not require CORS configuration. If a separately hosted browser client is intentionally used, `CORS_ORIGINS` may list trusted HTTP(S) origins as a comma-separated list without paths. Wildcards, path prefixes, and untrusted origins are rejected.

The implemented finite refresh-worker command additionally requires server-only `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `GROQ_API_KEY` values. It validates all four before it can begin, uses a database lease plus a Kolkata-calendar idempotency key, and exits after one bounded run. None of these values belong in browser builds, source control, client-side configuration, logs, or public documentation examples.

The worker is **not activated**: the live legacy refresh configuration has been reset to disabled/not-ready; no external cron, provider invocation, source fetch, candidate run, email, or public publication was created. A future server-only editorial process will require a separate `EDITORIAL_OPERATION_SECRET`; it is intentionally outside the public web surface and this worker does not publish signals.
