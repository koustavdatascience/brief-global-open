# Security Policy

## Reporting a vulnerability

Do not open a public issue with a credential, exploit proof, personal data, raw private policy artefact, or a detailed reproduction that could expose the private data boundary. Use GitHub private vulnerability reporting when it is enabled, or contact the repository owner privately.

Reports should identify the affected revision, the security boundary involved, safe reproduction steps, and potential impact. Please allow time for triage before disclosure.

## Security invariants

| Invariant    | Required behavior                                                                                        |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| Browser data | Use anonymous RLS projections only; no service-role key or provider key reaches a bundle.                |
| Worker data  | The finite worker uses a service role, an idempotency key, and a lease; it has no public endpoint.       |
| Model output | A provider response is locally validated, remains a private candidate, and cannot auto-publish a signal. |
| Sources      | Only bounded, approved sources may be fetched; arbitrary crawl targets are rejected.                     |
