# Contributing to Brief

Brief is an account-free public policy-intelligence application with a strict public/private data boundary. Contributions should be focused, reviewable, source-grounded, and free of copied code, invented policy claims, credentials, customer reviews, or raw private artefacts.

Before opening a pull request, run `pnpm check`, `pnpm test`, `pnpm build`, `pnpm validate:migrations`, `pnpm secret-scan`, and `pnpm independence-audit`. Describe the public behavior, data-access policy, failure states, test coverage, and any migration or rollback impact.

Changes to public data must preserve anonymous Row Level Security. Changes to worker code must preserve source bounds, server-only credentials, finite execution, lease/idempotency behavior, local structured-output validation, and the prohibition on automatic publication. Do not add a public operator surface or browser-side administrative capability without an approved requirements change.
