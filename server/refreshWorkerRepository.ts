import type { GlobalCandidateExecution } from "./globalCandidateExecutor";
import {
  createServiceRoleFetch,
  type ServiceRoleConfiguration,
} from "./shared/serviceRoleFetch";

export class RefreshWorkerRepositoryError extends Error {
  constructor(public readonly status: number) {
    super(`Refresh worker data request failed with status ${status}.`);
    this.name = "RefreshWorkerRepositoryError";
  }
}

export type WorkerRefreshConfiguration = {
  isEnabled: boolean;
  executorStatus: "not_ready" | "ready" | "paused";
};

export type WorkerApprovedSource = {
  id: string;
  name: string;
  sourceKind: "website" | "rss" | "document_feed" | "api";
  canonicalUrl: string;
  jurisdictionCode: string;
  sourceLanguage: string;
  isEnabled: boolean;
  fetchConfig: Record<string, unknown>;
};

export type ClaimedWorkerRun = { id: string; claimed: boolean };

export type RefreshWorkerRepository = {
  getConfiguration: () => Promise<WorkerRefreshConfiguration>;
  getApprovedSources: () => Promise<WorkerApprovedSource[]>;
  claimRun: (input: {
    executionKey: string;
    sourceCount: number;
    scheduledFor: string;
    workerId: string;
  }) => Promise<ClaimedWorkerRun>;
  finishRun: (input: {
    runId: string;
    status: "completed" | "failed";
    candidateCount: number;
    note: string;
  }) => Promise<void>;
  persistCandidate: (input: {
    runId: string;
    sourceId: string;
    execution: GlobalCandidateExecution;
  }) => Promise<"created" | "existing">;
};

type SourceRow = {
  id: string;
  name: string;
  source_kind: WorkerApprovedSource["sourceKind"];
  canonical_url: string;
  source_language: string;
  is_enabled: boolean;
  fetch_config: Record<string, unknown>;
  jurisdictions: { code: string } | null;
};

function analysisPersistenceFields(execution: GlobalCandidateExecution) {
  if (execution.analysis.outcome.status === "accepted") {
    return {
      analysis_status: "accepted",
      model_id: execution.analysis.modelId ?? null,
      candidate_payload: execution.analysis.outcome.signal,
      failure_code: null,
    } as const;
  }
  return {
    analysis_status:
      execution.analysis.outcome.status === "failed" ? "failed" : "abstained",
    model_id: execution.analysis.modelId ?? null,
    candidate_payload: null,
    failure_code: execution.analysis.outcome.reason,
  } as const;
}

function mapSource(row: SourceRow): WorkerApprovedSource {
  return {
    id: row.id,
    name: row.name,
    sourceKind: row.source_kind,
    canonicalUrl: row.canonical_url,
    jurisdictionCode: row.jurisdictions?.code ?? "UNKNOWN",
    sourceLanguage: row.source_language,
    isEnabled: row.is_enabled,
    fetchConfig: row.fetch_config,
  };
}

/**
 * This repository deliberately uses Supabase's service role only in the finite
 * worker process. It never reaches browser code or the public Express API.
 */
export function createRefreshWorkerRepository(
  configuration: ServiceRoleConfiguration,
  request: typeof fetch = fetch
): RefreshWorkerRepository {
  const serviceFetch = createServiceRoleFetch(
    configuration,
    request,
    status => new RefreshWorkerRepositoryError(status)
  );

  async function findDocument(
    sourceId: string,
    contentSha256: string
  ): Promise<{ id: string } | null> {
    const query = new URLSearchParams({
      select: "id",
      source_id: `eq.${sourceId}`,
      content_sha256: `eq.${contentSha256}`,
      limit: "1",
    });
    const response = await serviceFetch(
      `/rest/v1/global_refresh_documents?${query.toString()}`
    );
    return ((await response.json()) as Array<{ id: string }>)[0] ?? null;
  }

  return {
    async getConfiguration() {
      const response = await serviceFetch(
        "/rest/v1/global_refresh_configuration?select=is_enabled,executor_status&id=eq.true&limit=1"
      );
      const row = (
        (await response.json()) as Array<{
          is_enabled: boolean;
          executor_status: WorkerRefreshConfiguration["executorStatus"];
        }>
      )[0];
      if (!row) throw new RefreshWorkerRepositoryError(404);
      return { isEnabled: row.is_enabled, executorStatus: row.executor_status };
    },

    async getApprovedSources() {
      const response = await serviceFetch(
        "/rest/v1/global_approved_sources?select=id,name,source_kind,canonical_url,source_language,is_enabled,fetch_config,jurisdictions(code)&is_enabled=eq.true&order=name.asc&limit=8"
      );
      return ((await response.json()) as SourceRow[]).map(mapSource);
    },

    async claimRun(input) {
      const response = await serviceFetch(
        "/rest/v1/rpc/claim_external_global_refresh_run",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            p_execution_key: input.executionKey,
            p_source_count: input.sourceCount,
            p_scheduled_for: input.scheduledFor,
            p_worker_id: input.workerId,
            p_lease_seconds: 900,
          }),
        }
      );
      const row = (
        (await response.json()) as Array<{ run_id: string; claimed: boolean }>
      )[0];
      if (!row) throw new RefreshWorkerRepositoryError(409);
      return { id: row.run_id, claimed: row.claimed };
    },

    async finishRun(input) {
      await serviceFetch(
        `/rest/v1/global_refresh_runs?id=eq.${encodeURIComponent(input.runId)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({
            status: input.status,
            candidate_count: input.candidateCount,
            note: input.note.slice(0, 1000),
            finished_at: new Date().toISOString(),
            lease_expires_at: null,
          }),
        }
      );
    },

    async persistCandidate(input) {
      const { execution } = input;
      let document = await findDocument(
        input.sourceId,
        execution.document.contentSha256
      );
      if (!document) {
        try {
          const response = await serviceFetch(
            "/rest/v1/global_refresh_documents",
            {
              method: "POST",
              headers: { Prefer: "return=representation" },
              body: JSON.stringify({
                source_id: input.sourceId,
                source_document_url: execution.document.sourceDocumentUrl,
                official_record_url: execution.document.officialRecordUrl,
                title: execution.document.title,
                published_at: execution.document.publishedAt,
                content_sha256: execution.document.contentSha256,
                byte_size: execution.document.byteSize,
              }),
            }
          );
          document =
            ((await response.json()) as Array<{ id: string }>)[0] ?? null;
        } catch (error) {
          if (
            !(error instanceof RefreshWorkerRepositoryError) ||
            error.status !== 409
          )
            throw error;
          document = await findDocument(
            input.sourceId,
            execution.document.contentSha256
          );
        }
      }
      if (!document) throw new RefreshWorkerRepositoryError(409);

      const candidateQuery = new URLSearchParams({
        select: "id",
        run_id: `eq.${input.runId}`,
        document_id: `eq.${document.id}`,
        limit: "1",
      });
      const existing = await serviceFetch(
        `/rest/v1/global_refresh_candidates?${candidateQuery.toString()}`
      );
      if (((await existing.json()) as Array<{ id: string }>)[0])
        return "existing";

      const response = await serviceFetch(
        "/rest/v1/global_refresh_candidates",
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            run_id: input.runId,
            document_id: document.id,
            ...analysisPersistenceFields(execution),
          }),
        }
      );
      if (!((await response.json()) as Array<{ id: string }>)[0])
        throw new RefreshWorkerRepositoryError(409);
      return "created";
    },
  };
}
