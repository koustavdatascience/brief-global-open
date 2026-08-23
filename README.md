# Brief

**Brief** is an account-free, source-linked public feed for global policy intelligence. Every visitor sees the same published feed; there is no sign-in, private workspace, download gate, or user-facing operator console.

**Live website:** <https://brief-global-open.onrender.com>

> The `brief-global` repository identifier is provisional. `Brief` is a working name pending trademark and domain clearance; see [TRADEMARK.md](TRADEMARK.md).

## Public and private boundary

The browser and public REST API read only the anonymous-RLS projections for published `public_signals` and public `jurisdictions`. Raw source text, approved-source configuration, model candidates, refresh runs, editorial operations, service-role credentials, and model-provider credentials are excluded from the public surface.

| Area               | Current behavior                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public web service | React/Vite application served by Express with `/healthz` and anonymous `/api/public/*` endpoints.                                                           |
| Policy refresh     | A bounded finite worker supports Gemini → OpenRouter → Groq failure-only fallback, local schema validation, a Supabase lease, and no automatic publication. |
| Publishing         | Explicit future server-only editorial operation only; no public admin interface and no auto-publication.                                                    |
| Authentication     | Not used by the public product.                                                                                                                             |

## Local development

Use Node 22 and pnpm. Configure only through a local secret manager or the host’s secret interface; do **not** commit environment files or keys.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The public server requires `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The finite worker additionally requires `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, and `GROQ_API_KEY`; it is intentionally disabled in the database and must not be scheduled without a later explicit activation decision.

Run the release checks before opening a pull request:

```bash
pnpm check
pnpm test
pnpm build
pnpm validate:migrations
pnpm secret-scan
pnpm independence-audit
```

## Independent deployment

[`render.yaml`](render.yaml) is a **non-deploying** Blueprint for the public Node web service with automatic deploys disabled. [`deploy/render-daily-worker.render.yaml.example`](deploy/render-daily-worker.render.yaml.example) is deliberately not a root Blueprint and must not be synced until the owner explicitly approves a daily job, production credentials, and source readiness. See [the independent deployment plan](docs/independent-render-deployment.md) and [external configuration guide](docs/external-configuration.md).

No Dockerfile is required for the native Node deployment.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing. Do not commit credentials, raw private source material, run records, or generated candidates.

## License

Brief is provided under the [Apache License 2.0](LICENSE).
