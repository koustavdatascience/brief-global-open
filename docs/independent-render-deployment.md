# Independent Render Deployment Plan

**Status: preparation only.** This document and the checked-in Blueprint files do not create a Render account, service, cron job, deployment, provider request, candidate run, or public publication. The current Supabase refresh control is intentionally disabled and not-ready.

Brief is prepared for a conventional **Node web service** with a separate, short-lived **cron service**. The web service exposes only the anonymous public discovery API and the static browser application. The worker is not part of the web process: it claims one leased daily execution, evaluates the bounded approved sources, persists non-public candidate outcomes, and exits. It never publishes a public signal.

| Component             | Checked-in artefact                              | Command              | Secret boundary                                              | Activation status                             |
| --------------------- | ------------------------------------------------ | -------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Public web service    | `render.yaml`                                    | `pnpm start`         | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` only              | Not connected or deployed.                    |
| Finite daily worker   | `deploy/render-daily-worker.render.yaml.example` | `pnpm refresh:daily` | Supabase service role plus Gemini, OpenRouter, and Groq keys | Example only; no cron exists.                 |
| Editorial publication | None                                             | None                 | A future separate server-only operation secret               | Not designed for public UI and not activated. |

Render Blueprints conventionally use a root `render.yaml`; a web service can provide build, start, health-check, environment, and disabled automatic-deploy settings. [1] The public service uses the native Node runtime, so it does **not** need a custom Dockerfile or a long-running background process.

The worker example uses `30 18 * * *`, which is 00:00 in Asia/Kolkata when interpreted as UTC. Render cron schedules use UTC, run a command that must exit when finished, and provide a platform-level single-run guarantee. [2] The application nevertheless retains its own database lease and Kolkata-calendar execution key so it remains safe if the provider is changed or a run is retried.

## Owner-controlled activation checklist

| Required decision or check                                                              | Why it matters                                                                                               |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Create a new clean public repository from a credential-audited release export.          | The present private repository retains historical managed-template files and must not simply be made public. |
| Rotate the existing OpenRouter key and create separate production Gemini and Groq keys. | Credentials may not enter Git history, browser bundles, logs, or public documentation.                       |
| Confirm public-domain and trademark decisions for `Brief`.                              | `Brief` remains a working name pending clearance.                                                            |
| Review the approved-source list and the disabled refresh configuration.                 | The worker only processes approved bounded sources and begins fail-closed.                                   |
| Connect only the public-service Blueprint first, with automatic deployment still off.   | It permits independent runtime validation before a job or public release is enabled.                         |
| Explicitly approve the cron example and enter all worker secrets later.                 | A synced cron service creates a scheduled, billable external process.                                        |

Neither blueprint includes an automatic publication step. Editorial review and publishing remain a separate future server-only workflow.

## References

[1]: [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)

[2]: [Render Cron Jobs documentation](https://render.com/docs/cronjobs)
