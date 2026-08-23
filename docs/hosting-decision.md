# Brief Hosting Decision

## Decision

Brief’s approved target architecture is an **independent Node deployment on Render**: one public web service plus a separately invoked finite daily worker. This supersedes the earlier managed-hosting recommendation because the active product has been migrated to a portable Express/Vite runtime and the user explicitly requires deployment independent of Manus.

> **This is an architecture and release-preparation decision, not a deployment authorization.** No Render account, Blueprint sync, web service, cron job, external schedule, provider call, candidate run, or public release has been created.

| Option                                    | Decision               | Reason                                                                                                              |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Render web service plus separate cron job | **Recommended target** | Supports a conventional Node web process and a separately scheduled command that exits after a bounded run. [1] [2] |
| Railway                                   | Viable alternative     | It can support the same web/worker separation but is not the selected first integration target.                     |
| Vercel                                    | Not selected           | Brief now ships its own Express public API and finite worker rather than a function-first architecture.             |
| Managed hosting                           | Superseded             | The user’s approved requirement is an independent runtime and eventual clean public release.                        |

## Operational boundary

The web service receives only the browser-safe Supabase connection values. The worker receives the service-role and direct-provider credentials, but it has no public route. The worker remains disabled and fail-closed until a future owner decision. Its schedule would be `30 18 * * *` in Render’s UTC syntax, representing midnight in Asia/Kolkata; Render notes that cron schedules use UTC and job commands must exit after completion. [2]

See [the detailed independent Render plan](independent-render-deployment.md) for non-deploying Blueprint files, credential boundaries, and the owner activation checklist.

## References

[1]: [Render Blueprint YAML reference](https://render.com/docs/blueprint-spec)

[2]: [Render Cron Jobs documentation](https://render.com/docs/cronjobs)
