# Direct Provider Contract Notes

**Status:** implementation research only. No credentials were added, no provider request was made, and no refresh run, schedule, or publication was activated.

Brief will send the same bounded, source-grounded prompt and JSON schema to each provider from a server-only worker. The browser will never receive a provider key, raw source text, candidate payload, or provider response. Each provider result must still pass local Zod validation through `parseStructuredExtraction`; provider-side schema features are a formatting aid, not an editorial approval mechanism.

| Order | Provider   | Direct endpoint pattern                                                    | Output contract                                                                                                          | Fallback eligibility                                                |
| ----- | ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 1     | Gemini     | Gemini API request with `GEMINI_API_KEY`                                   | JSON schema / JSON response configured server-side                                                                       | Only a transient/provider failure may proceed to the next provider. |
| 2     | OpenRouter | `POST https://openrouter.ai/api/v1/chat/completions` with a Bearer token   | `response_format.type = json_schema`, strict schema, and routing constrained to supporting endpoints                     | Only a transient/provider failure may proceed to Groq.              |
| 3     | Groq       | `POST https://api.groq.com/openai/v1/chat/completions` with a Bearer token | Strict `json_schema`; the current official strict-capable options include `openai/gpt-oss-20b` and `openai/gpt-oss-120b` | A failure stops the document analysis as `provider_error`.          |

Gemini’s official documentation supports structured JSON output and provides the `generateContent` REST path; the direct implementation will retain the established `generateContent` format for the first portable iteration, rather than coupling the worker to a client SDK. [1] [2]

OpenRouter documents Bearer-token authentication and a JSON-schema response format. Its documentation also notes that schema support depends on the routed endpoint, so Brief will set `require_parameters: true` and retain local validation. [3] [4]

Groq documents an OpenAI-compatible base URL and strict structured-output mode. Strict mode requires every object’s `additionalProperties` to be `false` and every field to be required; Brief’s current schema needs a provider-specific normalization for nullable fields before it can safely use that mode. [5] [6]

An **accepted** extraction terminates the fallback chain. An abstention, invalid JSON, schema mismatch, missing evidence, or low-confidence result also terminates the chain and is persisted as a non-public review outcome. This prevents a later model from overriding a valid safety or evidence abstention. No provider output can directly create a `public_signals` row.

## References

[1]: https://ai.google.dev/gemini-api/docs/structured-output "Google Gemini API structured outputs"
[2]: https://ai.google.dev/api/generate-content "Google Gemini API generateContent reference"
[3]: https://openrouter.ai/docs/guides/features/structured-outputs "OpenRouter structured outputs"
[4]: https://openrouter.ai/docs/api_reference/authentication "OpenRouter authentication"
[5]: https://console.groq.com/docs/structured-outputs "Groq structured outputs"
[6]: https://console.groq.com/docs/openai "Groq OpenAI compatibility"
