# PRD: Adaptive AI Providers and Source-First Workspace Publication

**Product:** Brief
**Status:** Proposed for implementation
**Owner:** Koustav
**Date:** 2026-11-13
**Primary area:** Scheduled policy-intelligence workspace cycle

## 1. Problem statement

Brief currently performs two important jobs in one publication path:

1. It collects bounded documents from approved official policy sources.
2. It sends those documents to AI providers for evidence-grounded extraction, then publishes the resulting policy changes, ideas, PRDs, and PDFs.

The source collection path is working. The failure is occurring when the collected documents reach AI analysis. Provider models may become unavailable, provider accounts may hit rate limits, or a configured model may no longer be supported by the relevant API. At present, a cycle can collect documents successfully, publish zero changes, and still appear technically completed. The public Workspace then retains an older populated cycle, making the product appear inactive.

This PRD separates source visibility from AI enrichment. Official sources should remain visible when they are successfully collected. AI-generated interpretations, project ideas, PRDs, and PDFs must continue to require the existing evidence and quality gates.

## 2. Goals

### Primary goals

- Discover and select currently available provider models during each scheduled cycle.
- Automatically bypass unavailable, rate-limited, or failing providers without repeatedly wasting requests against them.
- Preserve the strict evidence-first publication gate for AI-generated policy changes.
- Publish successfully collected official sources even when AI analysis is temporarily unavailable.
- Clearly distinguish source-only records from AI-analyzed policy changes.
- Expose accurate cycle health and degraded-state information in the public Workspace.
- Prevent an AI outage from making the site look frozen at an old cycle.
- Generate ideas, PRDs, and PDFs only for changes that pass the existing structured evidence contract.

### Secondary goals

- Make provider failures diagnosable without logging credentials or response bodies.
- Make the system resilient to future provider model renames and retirements.
- Keep the process account-free and public for Workspace readers.
- Preserve idempotent scheduled runs and safe retries.

## 3. Non-goals

- This feature will not allow an AI model to browse the web or invent missing policy facts.
- This feature will not publish an AI-generated summary when the source text has not passed validation.
- This feature will not bypass evidence, provenance, confidence, or source-host checks.
- This feature will not automatically change API keys, billing plans, or provider account settings.
- This feature will not create a new source crawler. Existing approved-source and bounded-fetch rules remain in force.
- This feature will not generate a project idea or PDF for a source-only record.

## 4. Product principles

### Source visibility before enrichment

A successfully retrieved official document is useful even when enrichment is unavailable. Brief should show the official title, publisher, date, jurisdiction, and source link rather than hiding the document.

### Evidence before interpretation

A source-only record is not a policy summary. It must be labeled as collected and pending analysis. Only a validated AI extraction can receive a headline, summary, importance, confidence, topic classification, idea, PRD, or PDF.

### Fail over, do not fail open

Provider failures should move processing to another compatible provider. They must never cause unsupported claims to be published.

### Fail visibly, not silently

A technically successful worker execution is not necessarily a successful content cycle. The system must report whether sources were collected, whether analysis succeeded, and whether public enrichment was produced.

## 5. User experience

### 5.1 Latest cycle header

The Workspace must show the latest public cycle that contains either analyzed changes or source-only records. The header should show:

- Cycle date
- Number of official sources collected
- Number of analyzed changes
- Number of project ideas
- Cycle state

Example:

> November 13, 2026 · 24 sources · 0 analyzed changes · 0 ideas · Analysis degraded

When the cycle is fully successful:

> November 13, 2026 · 24 sources · 7 changes · 5 ideas · Completed

### 5.2 Source-only cards

Source-only cards must be visually distinct from analyzed change cards. Each card should display:

- Official source title
- Source name or agency
- Jurisdiction
- Published date
- A `Source collected` or `Analysis pending` badge
- Direct official source link
- A short operational status message when relevant

The card must not display a generated policy summary, confidence score, importance level, topic tags, potential project, PRD button, or PDF button unless an accepted analysis exists.

Suggested copy:

> Official source collected. Automated analysis is pending because the configured AI providers were unavailable during this cycle.

### 5.3 Analyzed change cards

Existing analyzed change cards should remain visually and behaviorally unchanged except for a clear status field where useful. They may display:

- Plain-language summary
- Change type
- Importance
- Topic tags
- Source link
- Project idea
- PRD expansion
- PDF download

### 5.4 Degraded cycle notice

When sources were collected but one or more providers failed, show a compact notice near the cycle header:

> Sources were collected successfully, but AI enrichment was partially unavailable. Brief will retry analysis during the next scheduled cycle.

Do not expose raw HTTP errors, API keys, internal provider payloads, or implementation details to public users.

## 6. Provider model discovery

### 6.1 Discovery timing

At the start of every scheduled cycle, Brief should build a runtime provider catalog. The catalog must be held in memory for the current process and should not require a database write for normal operation.

Discovery should occur once per provider per cycle, not once per document.

### 6.2 Gemini discovery

Use the configured Gemini credential to request the provider model list. Keep models that support the required text-generation operation. Prefer models according to this order:

1. Explicitly configured model, if available and compatible.
2. Current stable Flash-class model.
3. Current Lite or lower-cost text model.
4. Any remaining compatible text-generation model.

The implementation must normalize model names so both `models/foo` and `foo` forms are handled consistently.

### 6.3 OpenRouter discovery

Request the current model catalog and filter for models that:

- Are available to the current account.
- Support text chat completion.
- Are not marked unavailable.
- Are free when the deployment is configured for free-only operation.
- Support JSON object output or can reliably return schema-shaped JSON through prompt constraints.

Prefer the explicitly configured model if present in the catalog. Otherwise use a deterministic priority order based on capability, context length, and free availability. Do not select a vision-only model for text extraction.

### 6.4 Groq discovery

Request the current model list using the configured key. Keep models compatible with the OpenAI chat-completions request used by Brief. Prefer the configured model, then the strongest currently available general-purpose text model within the deployment’s cost policy.

### 6.5 Catalog failure behavior

If a provider catalog request fails:

- Use the last known model for that provider for one attempt.
- Mark the provider catalog as stale for the current cycle.
- If the attempt returns 404, skip the provider for the remainder of the cycle.
- If the attempt returns 429, open a cycle-scoped cooldown and skip further calls to that provider.

A provider catalog failure must not prevent other providers or source-only publication from proceeding.

## 7. Provider fallback and circuit breakers

### 7.1 Provider order

The runtime order is:

1. Gemini selected model
2. OpenRouter selected model chain
3. Groq selected model

The configured provider order may be overridden by a future configuration flag, but the default must remain deterministic.

### 7.2 Error classification

The analysis runner must classify failures as follows:

- **400:** request or capability mismatch. Retry once using the provider’s simpler JSON request mode, then skip the model.
- **401/403:** credential or permission failure. Disable that provider for the current cycle and log a sanitized diagnostic.
- **404:** model unavailable. Refresh the catalog once, select another compatible model, then skip the original model.
- **413:** source or prompt too large. Retry with an approved bounded source excerpt if available; otherwise mark the document as analysis-pending.
- **429:** provider or model rate limit. Open a cycle-scoped provider cooldown and continue with the next provider.
- **408/timeouts:** retry once with the same provider, then continue to the next provider.
- **500–599:** retry once, then continue to the next provider.
- **200 with invalid JSON:** mark the output invalid and continue to the next provider.
- **200 with valid JSON but failed evidence/confidence gate:** continue to the next provider. Never publish the rejected output.

### 7.3 Cycle-scoped circuit breaker

For each provider, maintain an in-memory state:

- `available`
- `cooldown`
- `credential_failed`
- `catalog_stale`
- `exhausted`

Once a provider reaches `cooldown`, `credential_failed`, or `exhausted`, subsequent documents in the same cycle must not call it again. This prevents 24 documents from producing repeated identical 429 and 404 errors.

### 7.4 Successful model recording

For each accepted analysis, record the actual provider model ID in the candidate record. This preserves provenance and makes it possible to compare provider reliability over time.

## 8. Source-first publication model

### 8.1 Record states

Brief should represent processing state explicitly:

- `collected`: official document was fetched and validated.
- `analysis_pending`: document is valid but no provider completed analysis.
- `analyzed`: structured extraction was accepted.
- `analysis_rejected`: provider returned output that failed the extraction contract.
- `published`: analyzed change was materialized into the public Workspace.

The source document and its provenance remain available regardless of AI state.

### 8.2 Data model changes

Add a source-publication table or equivalent source-only fields to the Workspace schema. The preferred design is a separate `brief_source_records` table with:

- `id`
- `cycle_id`
- `document_id`
- `jurisdiction_id`
- `source_name`
- `title`
- `official_record_url`
- `published_at`
- `content_sha256`
- `status`
- `status_reason`
- `is_public`
- `created_at`

Recommended status values:

- `analysis_pending`
- `analysis_failed`
- `analysis_rejected`

The existing `brief_changes` table remains reserved for accepted, source-grounded policy signals. This avoids giving source-only rows fake confidence, importance, or policy classification fields.

### 8.3 Source-only publication rules

A source record may be public when:

- It came from an enabled approved source.
- Its URL passed the existing host and HTTPS checks.
- Its title and source metadata are non-empty.
- Its content hash is present.
- The cycle completed source ingestion.

A source record must not be public when:

- The source host is unapproved.
- The document is invalid or empty.
- The fetch failed.
- The source is disabled.

### 8.4 Public cycle selection

The public API should select the latest completed cycle where either:

- `change_count > 0`, or
- `source_record_count > 0`.

This preserves the last fully enriched cycle only when the new cycle has no usable public source records at all.

## 9. Ideas, PRDs, and PDFs

The existing idea and PRD workflow remains unchanged for accepted changes.

A source-only record must never receive:

- A generated project idea
- A rationale
- A PRD expansion
- A PDF download

When a later cycle successfully analyzes the same source document, the accepted change may be created or linked using the existing content hash and source-candidate provenance. Idea and PRD generation can then proceed normally.

## 10. Cycle status and reporting

Add explicit cycle-level counters and status:

- `source_count`
- `source_record_count`
- `change_count`
- `idea_count`
- `analysis_pending_count`
- `analysis_failed_count`
- `status`

Recommended status values:

- `running`
- `completed`
- `completed_with_warnings`
- `source_only`
- `failed`

Mapping rules:

- `completed`: source collection and AI enrichment completed without material provider degradation.
- `completed_with_warnings`: at least one source or analysis operation degraded, but at least one analyzed change was published.
- `source_only`: source records were published, but no analyzed changes were accepted.
- `failed`: source collection or database materialization failed before a safe public result could be produced.

The GitHub Action should exit successfully for `completed`, `completed_with_warnings`, and `source_only`. It should fail for `failed` so operational monitoring can distinguish a safe degraded cycle from a broken worker.

## 11. Observability

Each cycle should log safe structured events:

- Catalog discovery result per provider
- Selected model ID per provider
- Number of catalog candidates
- Provider cooldown or disable event
- Provider HTTP status classification
- Number of documents collected
- Number of documents analyzed successfully
- Number of documents pending analysis
- Number of source-only records published
- Number of changes published
- Number of ideas and expansions generated
- Final cycle state

Never log:

- API keys
- Authorization headers
- Full source text
- Full provider response bodies
- User secrets

## 12. Acceptance criteria

### Model discovery

- A scheduled cycle checks the current Gemini, OpenRouter, and Groq model catalogs at most once per provider.
- If the configured model is unavailable, a compatible current model is selected automatically.
- If the catalog is unavailable, the last configured model is attempted once without preventing fallback.
- The selected model IDs are visible in sanitized worker logs and persisted for accepted candidates.

### Fallback

- A 404 does not cause the same model to be retried for every document.
- A 429 opens a cycle-scoped provider cooldown.
- A provider outage does not prevent other providers from processing documents.
- Invalid or low-confidence model output continues to the next provider.
- No provider failure results in an ungrounded public change.

### Source-first publication

- A cycle with valid fetched documents and zero accepted AI analyses publishes source-only records.
- Source-only records contain a direct official URL and provenance hash.
- Source-only records are clearly labeled as pending or failed analysis.
- Source-only records do not show confidence, importance, ideas, PRDs, or PDFs.
- The public API returns the latest source-only cycle instead of an older cycle when source records exist.

### Regression safety

- Existing accepted changes continue to render correctly.
- Existing PRD and PDF export behavior remains unchanged.
- Existing idempotency and duplicate-content protections remain unchanged.
- All provider, source-only publication, public API, and UI tests pass.
- The production build passes.

## 13. Rollout plan

### Phase 1: Provider abstraction

Implement provider catalog clients, model capability filtering, cycle-scoped circuit breakers, and sanitized diagnostics. Keep the existing publication gate unchanged.

### Phase 2: Source-only persistence

Add the source-record migration, repository methods, cycle counters, and worker materialization. Add tests for empty AI availability and duplicate source records.

### Phase 3: Public API and UI

Expose source records and cycle health through the public API. Add source-only cards and degraded-cycle notices in the Workspace.

### Phase 4: Controlled production run

Run one manual cycle with the new code. Verify that:

- official sources are visible;
- no unsupported summaries are present;
- provider cooldowns are respected;
- accepted analyses still create changes;
- ideas and PDFs are created only for accepted changes.

### Phase 5: Scheduled monitoring

Monitor the next three scheduled cycles. Compare source counts, source-only counts, accepted-change counts, provider status distribution, and public cycle selection.

## 14. Risks and mitigations

### Risk: A provider catalog lists a model that is technically available but incompatible with Brief’s request format.

**Mitigation:** filter by capability where available, use a minimal compatibility probe or one controlled request, and fall back on 400/404 without publishing the output.

### Risk: Source-only records overwhelm the Workspace.

**Mitigation:** retain the existing maximum public item count, paginate or group source-only records, and show the latest bounded set with a link to the official source.

### Risk: Users mistake source-only titles for confirmed policy summaries.

**Mitigation:** use a distinct visual treatment and explicit status copy. Do not use confidence or importance badges for source-only records.

### Risk: Provider discovery increases cycle duration.

**Mitigation:** perform discovery once per provider, use short timeouts, cache the catalog for the cycle, and continue with the configured model if discovery times out.

### Risk: Automatic model selection changes output quality.

**Mitigation:** preserve strict schema, evidence, confidence, and provenance gates; record the model used; add a configurable allowlist and minimum capability filter.

## 15. Success metrics

After rollout, Brief should be able to measure:

- Percentage of cycles with successful source collection
- Percentage of collected documents visible as source-only or analyzed records
- Percentage of documents accepted by AI analysis
- Provider success, 404, 429, timeout, and invalid-output rates
- Average time from collection to accepted analysis
- Percentage of source-only records later enriched in a subsequent cycle
- Number of published changes, ideas, and PRDs per cycle

The immediate success condition is not that every source receives an AI summary. It is that a provider outage no longer makes a healthy source collector look inactive, while the evidence standard remains intact.
