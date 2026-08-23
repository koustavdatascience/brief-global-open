import { readFile } from "node:fs/promises";

const migration = await readFile(
  "supabase/migrations/0001_public_feed_and_worker.sql",
  "utf8"
);
const required = [
  "create table public.jurisdictions",
  "create table public.public_signals",
  "create table public.global_refresh_configuration",
  "create table public.global_refresh_candidates",
  "enable row level security",
  "claim_external_global_refresh_run",
];

const missing = required.filter(token => !migration.includes(token));
if (missing.length) {
  console.error(`Migration validation failed; missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(
  "Migration validation passed for the public-feed and private-worker bootstrap."
);
