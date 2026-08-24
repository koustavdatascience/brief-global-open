# Brief Global Open — Security and Repository Cleanup Audit

**Date:** 25 August 2026  
**Repository:** [`koustavdatascience/brief-global-open`](https://github.com/koustavdatascience/brief-global-open)  
**Audited commit:** [`9cb38b3`](https://github.com/koustavdatascience/brief-global-open/commit/9cb38b3)  
**Author:** Manus AI

## Executive summary

The repository has been audited and cleaned. No confirmed critical authentication bypass, committed provider secret, SQL injection, direct React XSS sink, or unauthenticated public write route was found. The application is intentionally account-free and exposes a read-only public policy feed; that design is preserved. The highest-priority remaining risks are operational rather than an immediately exploitable code execution path: public endpoints have no application-level rate limit, the browser workspace request deliberately defeats shared caching, anonymous Supabase access relies on table-wide grants plus RLS, provider requests need a stronger semantic publication gate, and GitHub Actions uses mutable action tags.

The cleanup removed one orphaned component, four unreferenced collection helpers with their supporting types/constants, unused imports and locals reported by strict TypeScript, and an inactive analytics script whose two Vite environment placeholders were never configured. No dependency was removed without proof. Three shared server utilities now centralize service-role request construction, PostgREST `in.(...)` filters, and India-calendar date formatting. The refactor preserves existing outputs and error types.

The former **47-commit** main history was rewritten into **8 logical Conventional Commits** and force-pushed with `--force-with-lease`. The current local tree is clean and `origin/main` points to `9cb38b3`. A local rollback reference remains at `pre-cleanup-history-2026-08-25`.

## Validation evidence

| Check                                 |                                       Result |
| ------------------------------------- | -------------------------------------------: |
| `pnpm check`                          |                                       Passed |
| Strict TypeScript unused-symbol check |                                       Passed |
| Vitest                                |          **56 tests passed across 18 files** |
| Production build                      | Passed; existing large-chunk warning remains |
| Prettier/lint check                   |                                       Passed |
| Migration validation                  |                                       Passed |
| Workspace-cycle validation            |                                       Passed |
| Current-tree secret scan              |               Passed for 88 repository files |
| Independence audit                    |               Passed for 88 repository files |
| Git diff check                        |                                       Passed |
| Live Render public health suite       |                               **8/8 passed** |
| Working tree and remote alignment     |           Clean; `main` equals `origin/main` |

The local public-discovery test requires harmless placeholder Supabase environment values because `server/supabaseData.ts` reads its public configuration at module load. This was a test-environment detail; no real credentials were used in local validation.

## Security findings ranked by severity

### High and critical findings

| Severity | Finding                                                                                 | Status        |
| -------- | --------------------------------------------------------------------------------------- | ------------- |
| Critical | Authentication bypass or privilege escalation                                           | **Not found** |
| Critical | Provider/service-role secret committed to the repository or exposed in public responses | **Not found** |
| High     | SQL injection or arbitrary command execution through public input                       | **Not found** |
| High     | Direct React HTML injection sink                                                        | **Not found** |
| High     | Unauthenticated public write route                                                      | **Not found** |

The public Express server exposes only `GET` endpoints for health, jurisdictions, signals, and the public workspace. Public query parameters are bounded or validated, and the public repository selects only named columns. Worker writes use the service-role key in worker-only code. The frontend renders database and model text as React text nodes rather than inserting raw HTML. [2] [3]

### Medium findings

#### M1 — No application-level rate limiting on public API routes

**Exploit.** An unauthenticated client can repeatedly call `/api/public/signals`, `/api/public/jurisdictions`, and especially `/api/public/workspace`. Although query sizes are bounded, an attacker can create request volume, consume Render/Supabase capacity, and amplify upstream availability cost. There is no `express-rate-limit`, proxy quota, or equivalent application control in the repository.

**Exact fix.** Add an edge or server rate limit before the public API routes. A server-side implementation should use a bounded store appropriate for the deployment topology, not an unbounded per-process map:

```ts
import rateLimit from "express-rate-limit";

app.use(
  "/api/public",
  rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);
```

For multiple Render instances, use a shared Redis-compatible store or configure the Render/edge layer instead. Add tests for normal requests, `429`, and `Retry-After` behavior.

#### M2 — Browser cache-busting defeats the public API cache

**Exploit.** `getPublicWorkspace()` appends `?refresh=${Date.now()}` to every browser request. That makes every request appear unique to shared caches and weakens the protection provided by the server’s `public, max-age=60, stale-while-revalidate=300` header. Repeated refreshes therefore reach the application and Supabase more often than necessary.

**Exact fix.** Replace the client call with the stable route:

```ts
export function getPublicWorkspace(signal?: AbortSignal) {
  return getJson<PublicWorkspace>("/api/public/workspace", signal);
}
```

Retain the server cache header and add a short server-side cache if the site needs stronger upstream protection. This is independent of the rate limit and should be implemented together with M1.

#### M3 — Anonymous base-table grants make future RLS mistakes more dangerous

**Exploit.** The migrations revoke anonymous access and then grant table-wide `SELECT` on public tables, relying on row-level policies to hide unpublished rows. That is functioning today, but a future policy edit or newly added column can expose more data than intended. The workspace tables also grant anonymous `SELECT` over the base tables rather than a deliberately narrow public projection.

**Exact fix.** Publish explicit views containing only the intended public columns and revoke anonymous access from the base tables. For example, create views for public signals and each workspace projection, grant `SELECT` on those views to `anon` and `authenticated`, and change the server repository paths to query the views. If the Supabase version supports it, use `security_invoker` views so the underlying RLS policy remains part of the defense in depth. Add a migration test that attempts anonymous reads of unpublished rows and verifies that private columns are not selectable.

#### M4 — Model output is schema-valid but not fully source-grounded

**Exploit.** The AI pipeline treats downloaded source text as untrusted data and requires JSON shape, evidence, and confidence. However, a malicious or compromised source document could still influence a model into producing plausible but unsupported accepted fields. Schema validation prevents malformed data, not semantic prompt injection or factual drift. The generated result is later eligible for publication when confidence is high enough.

**Exact fix.** Keep the existing system instruction and delimiters, then add a semantic publication gate. For each accepted candidate, require at least one returned evidence quote to match a normalized substring of the bounded source text; require the official URL to come from the server-controlled document record rather than model output; and abstain when evidence coverage is absent or too weak. Store the raw model result only in the private candidate table and publish only the normalized server-built projection. Add adversarial source-text tests containing instructions such as “ignore previous requirements” and verify that no unsupported field is published.

### Low findings

#### L1 — Supabase public fetches have no explicit timeout and the URL is generic

**Exploit.** A stalled upstream Supabase request can occupy a public request for the platform’s default fetch duration. Also, `SUPABASE_URL` is validated only as a generic URL, so a misconfigured deployment could send the publishable key to an unintended HTTPS host.

**Exact fix.** Validate the URL once against the expected Supabase hostname/project origin and apply a timeout unless the caller supplies one:

```ts
const SUPABASE_TIMEOUT_MS = 10_000;
const parsed = new URL(supabaseUrl);
if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co")) {
  throw new Error("SUPABASE_URL must be an approved HTTPS Supabase origin");
}

const response = await fetch(`${supabaseUrl}${path}`, {
  ...init,
  signal: init.signal ?? AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
  headers: { ... }
});
```

Prefer an exact project-origin allowlist rather than a suffix check when the deployment is permanently tied to one project.

#### L2 — GitHub Actions dependencies use mutable tags

**Exploit.** `actions/checkout@v4` and `actions/setup-node@v4` are moving tags. If an upstream tag or release is compromised, a future workflow run could execute changed code with access to encrypted worker secrets.

**Exact fix.** Pin each action to a reviewed full commit SHA and update it deliberately through a dependency-review change. Do not substitute an invented SHA; obtain the SHA from the official action release and record the release in the workflow comment.

#### L3 — Workspace publication policy does not independently constrain future cycles

**Exploit.** Public workspace rows require `status = 'completed'` and `is_public = true`, but the workspace RLS predicates do not independently require `scheduled_for <= now()`. If a future worker or data edit marks a future cycle completed and public, it could be returned before its intended time.

**Exact fix.** Add `and scheduled_for <= now()` to the cycle policy and include the corresponding completed-cycle predicate in the child-table policies, or enforce the same condition through the public views. Add a regression test with a future completed cycle.

#### L4 — Local Vite middleware accepts all hosts

**Exploit.** The development-only middleware path sets `allowedHosts: true`. This is not used by the production static-server path, but if a developer exposes the dev server broadly, host-header/DNS-rebinding protections are weakened.

**Exact fix.** Restrict local development to explicit hosts such as `localhost`, `127.0.0.1`, and the known temporary development hostname. Keep production on the static server path and never use `allowedHosts: true` there.

## Security controls that passed review

The public server disables `x-powered-by`, sets CSP, Referrer-Policy, `X-Content-Type-Options`, and `X-Frame-Options`, and allows CORS only for explicitly configured origins. Errors returned to public clients are generic and do not include upstream response bodies, URLs, or credentials. Numeric parameters are bounded; malformed jurisdictions return `400`; Supabase query parameters are built through `URLSearchParams`; worker identifiers are URL-encoded; and Federal Register document URLs are restricted to HTTPS on the approved host. [2] [3]

The account-free design is intentional. There is no user-owned or private browser route in the current public product, so the absence of login on the public feed is not an authentication flaw. If private features are added later, they must be introduced behind an explicit authenticated route and a server-side authorization policy rather than by trusting frontend navigation.

`pnpm audit --prod` reported no known vulnerabilities. The repository-wide secret scan found no credential-shaped marker in the current tree, and a history scan covered all 47 pre-cleanup commits without printing matched lines or values. This does not invalidate the operational recommendation to rotate provider credentials that were previously pasted into chat; that exposure occurred outside the repository and should be treated as real.

## Dead-code and unused-configuration proof

The following items were removed only after repository-wide reference checks or compiler diagnostics supplied proof.

| Removed item                                                                                                                                | Proof before deletion                                                                                                                                                                                                            | Result                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `client/src/components/EditorialSectionHeader.tsx`                                                                                          | `git grep EditorialSectionHeader -- ':!client/src/components/EditorialSectionHeader.tsx'` returned no matches. The file had no registration or side effect.                                                                      | Deleted.                                                    |
| `classifyCandidate`, `collectionExecutionKey`, `sourceRunExecutionKey`, and `shouldCreateDocumentVersion` from `server/collectionEngine.ts` | For each symbol, `git grep` outside the defining file returned zero matches. Their supporting `CandidateDisposition`, `CandidateResult`, skip-path list, and generic-extension set were reachable only from `classifyCandidate`. | Deleted; live `canonicalizeHttpsUrl` and `sha256` retained. |
| Unused React default imports                                                                                                                | `tsc --noEmit --noUnusedLocals --noUnusedParameters` reported TS6133 at exact import lines in the route shell, tests, Discover, NotFound, and Workspace.                                                                         | Removed.                                                    |
| Unused landing icons and `const Icon = item.icon`                                                                                           | Strict TypeScript reported `GitFork`, `Star`, `Globe2`, `Layers3`, `LockKeyhole`, `Sparkles`, and `Icon` as TS6133. The actual `item.icon` JSX use remains untouched.                                                            | Removed only the unused bindings.                           |
| Unused worker imports                                                                                                                       | Strict TypeScript reported `GlobalCandidateExecutorError`, `WorkerApprovedSource`, and `z` as TS6133.                                                                                                                            | Removed.                                                    |
| Analytics placeholders                                                                                                                      | `VITE_ANALYTICS_ENDPOINT` and `VITE_ANALYTICS_WEBSITE_ID` appeared only in the inactive script in `client/index.html`; the production build emitted placeholder warnings and no analytics configuration existed elsewhere.       | Removed the script and dead placeholders.                   |

No package was deleted. `ajv` is used by `server/extractionContract.test.ts`; runtime packages are imported by active application code; compiler, bundler, formatter, runner, and type packages are used by package scripts or TypeScript configuration. The optional Knip run could not complete because its Oxc parser failed with an `Array buffer allocation failed` error, so its output was not treated as proof. Manual reference analysis and strict TypeScript were used instead.

The final comment scan found no commented-out implementation block or `TODO`/`FIXME` scaffold requiring deletion. Remaining block comments are live JSDoc or JSX comments documenting active behavior.

## Behavior-preserving refactor

Three small shared utilities were added under `server/shared/`:

| Utility                             | Consolidated behavior                                                                                                                                               |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server/shared/serviceRoleFetch.ts` | The identical worker-side Supabase request headers and non-2xx handling. Each caller still supplies its own error class, so observable error behavior is preserved. |
| `server/shared/postgrest.ts`        | The identical `in.(...)` filter formatting used by the public workspace repository and workspace worker.                                                            |
| `server/shared/indiaCalendar.ts`    | The identical Asia/Kolkata calendar-date extraction used to form worker execution keys and workspace cycle keys.                                                    |

The refactor was validated by type-checking, strict unused-symbol checking, all 56 tests, production builds, and live public health checks. No API contract or UI behavior was intentionally changed.

## Staged-change review and history cleanup

At the beginning of the work, the index and working tree were clean: there were **no staged changes** and no unstaged changes to review. The cleanup was therefore created as a deliberate commit rather than mixed into pre-existing user work.

The old 47-commit history was rewritten into these eight logical commits:

| Commit    | Conventional message                                            | Why the commit exists                                                            |
| --------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `493c509` | `feat(core): establish public policy intelligence site`         | Establishes the account-free public feed foundation and safe server boundary.    |
| `37b5dfa` | `feat(landing): build a focused open-source landing experience` | Gives visitors a coherent product identity and clear browse-first explanation.   |
| `1a69ec9` | `feat(workspace): add scheduled source-linked policy workspace` | Adds the repeatable source-linked workspace, ideas, and controlled refresh path. |
| `ae84c1f` | `feat(workspace): add professional PRD exploration and export`  | Lets readers move from a change to a grounded, downloadable product brief.       |
| `4d6c8e1` | `fix(automation): harden scheduled workspace publication`       | Prevents incomplete output from becoming public and gates private credentials.   |
| `7a6755a` | `fix(landing): keep one primary workspace CTA`                  | Removes competing header actions so the landing path is unambiguous.             |
| `3968b06` | `fix(ci): allow required dependency build steps`                | Makes the scheduled worker installation deterministic on GitHub runners.         |
| `9cb38b3` | `refactor(repo): remove dead code and share worker utilities`   | Removes proven dead code and centralizes repeated worker logic for auditability. |

The cleaned `main` history was pushed to GitHub with a lease-protected force update. The local rollback branch `pre-cleanup-history-2026-08-25` points to the pre-rewrite cleanup tree at `bfdad50`; it is not part of `origin/main`.

## Recommended next security-hardening order

First, implement M1 and M2 together because they directly reduce public abuse and upstream load. Second, replace base-table anonymous grants with explicit public projections under M3. Third, strengthen candidate semantic validation under M4 before expanding the number of approved sources. Finally, pin Actions and add the timeout/URL validation and future-cycle predicate. Rotate the previously chat-exposed provider keys before any further long-term automation use.

## References

[1]: https://github.com/koustavdatascience/brief-global-open/tree/9cb38b3 "Brief Global Open audited repository"
[2]: https://github.com/koustavdatascience/brief-global-open/blob/9cb38b3/server/publicServer.ts "Public Express server"
[3]: https://github.com/koustavdatascience/brief-global-open/blob/9cb38b3/supabase/migrations/0001_public_feed_and_worker.sql "Public feed and private worker migration"
[4]: https://github.com/koustavdatascience/brief-global-open/blob/9cb38b3/.github/workflows/workspace-cycle.yml "Workspace cycle workflow"
[5]: https://github.com/koustavdatascience/brief-global-open/blob/9cb38b3/package.json "Package manifest and scripts"
[6]: https://github.com/koustavdatascience/brief-global-open/commit/9cb38b3 "Cleaned repository commit"
