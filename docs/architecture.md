# Architecture Boundary

Brief is an account-free global policy-intelligence feed. Every visitor sees the same published, source-linked discovery surface. The portable runtime is intentionally independent of managed authentication, managed scheduling, and managed provider gateways.

| Layer            | Implementation                                          | Boundary                                                                                                             |
| ---------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Browser          | React, Vite, TypeScript                                 | Calls only anonymous `/api/public/*` endpoints and contains no service-role or model-provider credential.            |
| Public server    | Express serving `dist/public`                           | Provides `/healthz` and anonymous discovery endpoints backed by Supabase public RLS projections.                     |
| Public data      | Supabase `jurisdictions` and published `public_signals` | Anonymous reads expose only published, due, feed-safe fields.                                                        |
| Private data     | Supabase source, document, candidate, and run tables    | Raw source material, source controls, candidates, and audit records have no public endpoint.                         |
| Worker           | Finite Node command, invoked externally only            | Requires service credentials; uses a database lease and a Kolkata-calendar execution key; no timers or HTTP handler. |
| Editorial review | Future server-only operation                            | No user-facing control plane and no automatic publication path.                                                      |

The worker supports direct Gemini as the primary structured-analysis provider, OpenRouter as a secondary provider, and Groq as a tertiary provider. A provider result is locally validated against the strict schema and stored as a private candidate. Failover occurs only after an eligible provider failure; abstentions, invalid results, or insufficient evidence terminate the chain. No provider output may write directly to `public_signals`.

## Security invariants

The browser-safe Supabase publishable key is not a secret. The Supabase service-role key and all provider keys are server-only; they must never enter browser bundles, client responses, Git history, logs, tests, screenshots, or documentation examples. Supabase RLS is the primary data boundary and the dedicated service-role worker is a narrowly scoped privileged client.

Source fetching remains bounded to explicitly approved adapters. The current finite worker foundation contains no external schedule, arbitrary crawler, email delivery, or auto-publication process. The legacy managed refresh configuration is disabled and not-ready.

## Data integrity rules

Supabase business timestamps use UTC `timestamptz` values. A daily refresh has a deterministic Kolkata-calendar execution key and a database lease to protect against duplicate or overlapping calls. Candidate persistence is idempotent, and raw provider responses remain operational data rather than public intelligence.

## References

[1]: [Supabase Row Level Security documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

[2]: [Independent Render deployment plan](independent-render-deployment.md)
