# Direct Provider Contract Notes

The generation quality bar is a production design brief rather than a generic project suggestion. Brief should propose a serious system only when the source creates a defensible operational, market, or economic problem. The reference quality bar is an end-to-end workflow that can combine source ingestion, classification, remediation, CI or runtime verification, evidence history, exports, scheduled monitoring, and a hosted/self-hosted boundary where relevant. The model must narrow or reject an idea when the source cannot support that level of specificity.

**Status:** implementation research only. No credentials were added, no provider request was made, and no refresh run, schedule, or publication was activated.

Brief will send the same bounded, source-grounded prompt and JSON schema to each provider from a server-only worker. The browser will never receive a provider key, raw source text, candidate payload, or provider response. Each provider result must still pass local Zod validation through `parseStructuredExtraction`; provider-side schema features are a formatting aid, not an editorial approval mechanism.

| Order | Provider / model   | Direct endpoint pattern                                                    | Output contract                                                                                            | Fallback eligibility                                       |
| ----- | ------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1     | Gemini             | Gemini API request with `GEMINI_API_KEY`                                   | JSON schema / JSON response configured server-side                                                         | Provider failure proceeds to the free OpenRouter chain.    |
| 2     | MiniMax M3         | `POST https://openrouter.ai/api/v1/chat/completions` with a Bearer token   | JSON-object response requested; local Zod validation remains authoritative                                 | Failure proceeds to Nemotron Nano Omni.                    |
| 3     | Nemotron Nano Omni | Same OpenRouter endpoint                                                   | Prompt-constrained JSON; this free endpoint does not advertise `response_format`; local validation applies | Failure proceeds to Laguna S 2.1.                          |
| 4     | Laguna S 2.1       | Same OpenRouter endpoint                                                   | Prompt-constrained JSON; this free endpoint does not advertise `response_format`; local validation applies | Failure proceeds to Groq.                                  |
| 5     | Groq               | `POST https://api.groq.com/openai/v1/chat/completions` with a Bearer token | Existing Groq fallback and local validation                                                                | A failure stops the document analysis as `provider_error`. |

Gemini’s official documentation supports structured JSON output and provides the `generateContent` REST path; the direct implementation will retain the established `generateContent` format for the first portable iteration, rather than coupling the worker to a client SDK. [1] [2]

OpenRouter documents Bearer-token authentication, model-level fallbacks, and structured outputs only for compatible endpoints. Brief therefore tries the requested free models in order and uses JSON-object formatting only for MiniMax M3; Nano Omni and Laguna are still protected by prompt constraints and local validation because their free entries do not advertise `response_format`. [3] [4]

Groq documents an OpenAI-compatible base URL and strict structured-output mode. Strict mode requires every object’s `additionalProperties` to be `false` and every field to be required; Brief’s current schema needs a provider-specific normalization for nullable fields before it can safely use that mode. [5] [6]

An **accepted** extraction terminates the fallback chain. For global extraction, an abstention, invalid JSON, schema mismatch, missing evidence, or low-confidence result also terminates the chain and is persisted as a non-public review outcome; provider failures alone move to the next model. Workspace idea and expansion generation tries the next free model when a provider is unavailable, rate-limited, times out, returns malformed JSON, or fails the local schema/quality gate. It then tries the configured Groq fallback before using a grounded deterministic fallback. Expansion output must contain the full implementation-ready PRD structure, including operating model, architecture, workflow state, evidence lineage, integrations, security, observability, deployment topology, MVP vertical slice, scale path, economics, risks, and source. This prevents a provider outage or shallow response from silently degrading the product. A later model may replace an invalid generation, but it cannot override a valid safety or evidence abstention in the global extraction path. No provider output can directly create a `public_signals` row.

## References

[1]: https://ai.google.dev/gemini-api/docs/structured-output "Google Gemini API structured outputs"
[2]: https://ai.google.dev/api/generate-content "Google Gemini API generateContent reference"
[3]: https://openrouter.ai/docs/guides/features/structured-outputs "OpenRouter structured outputs"
[4]: https://openrouter.ai/docs/api_reference/authentication "OpenRouter authentication"
[5]: https://console.groq.com/docs/structured-outputs "Groq structured outputs"
[6]: https://console.groq.com/docs/openai "Groq OpenAI compatibility"
