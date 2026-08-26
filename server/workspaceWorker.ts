import { PolicySignalSchema } from "./extractionContract";
import {
  generateWorkspaceExpansion,
  generateWorkspaceIdea,
  type WorkspaceChangeInput,
} from "./briefWorkspaceAi";
import { parseRefreshWorkerEnv, runDailyRefreshWorker } from "./refreshWorker";
import { createRefreshWorkerRepository } from "./refreshWorkerRepository";
import { indiaCalendarDate, INDIA_TIMEZONE } from "./shared/indiaCalendar";
import { postgrestIn } from "./shared/postgrest";
import { classifyWorkspaceTopics } from "../shared/workspaceTopics";
import {
  createServiceRoleFetch,
  type ServiceFetch,
  type ServiceRoleConfiguration,
} from "./shared/serviceRoleFetch";

const MAX_WORKSPACE_CHANGES = 12;
const MIN_AUTOMATIC_PUBLICATION_CONFIDENCE = 0.8;

class WorkspaceWorkerError extends Error {
  constructor(public readonly status: number) {
    super(`Workspace worker data request failed with status ${status}.`);
    this.name = "WorkspaceWorkerError";
  }
}

type CandidateRow = {
  id: string;
  document_id: string;
  model_id: string | null;
  candidate_payload: unknown;
};

type DocumentRow = {
  id: string;
  source_id: string;
  official_record_url: string;
  published_at: string | null;
  content_sha256: string;
};

type SourceRow = {
  id: string;
  name: string;
  jurisdiction_id: string;
  is_enabled: boolean;
};

type JurisdictionRow = {
  id: string;
  code: string;
};

async function jsonRows<T>(request: ServiceFetch, path: string): Promise<T[]> {
  return (await (await request(path)).json()) as T[];
}

function cycleKey(now: Date) {
  return `brief-workspace-cycle:${indiaCalendarDate(now)}`;
}

function changeType(signalType: string) {
  if (signalType === "regulatory_change") return "regulation" as const;
  if (signalType === "enforcement") return "enforcement" as const;
  if (signalType === "market_access") return "market_access" as const;
  if (signalType === "consultation" || signalType === "standard")
    return "guidance" as const;
  return "other" as const;
}

function importance(confidence: number) {
  if (confidence >= 0.8) return "material" as const;
  if (confidence >= 0.65) return "notable" as const;
  return "watch" as const;
}

async function findOrCreateCycle(
  request: ServiceFetch,
  input: { key: string; scheduledFor: string; sourceCount: number }
) {
  const existing = await jsonRows<{ id: string }>(
    request,
    `/rest/v1/brief_cycles?select=id&cycle_key=eq.${encodeURIComponent(input.key)}&limit=1`
  );
  if (existing[0]) return existing[0].id;
  const response = await request("/rest/v1/brief_cycles", {
    method: "POST",
    headers: {
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify({
      cycle_key: input.key,
      scheduled_for: input.scheduledFor,
      timezone: INDIA_TIMEZONE,
      status: "running",
      source_count: input.sourceCount,
    }),
  });
  const created = (await response.json()) as Array<{ id: string }>;
  if (created[0]) return created[0].id;
  const fallback = await jsonRows<{ id: string }>(
    request,
    `/rest/v1/brief_cycles?select=id&cycle_key=eq.${encodeURIComponent(input.key)}&limit=1`
  );
  if (!fallback[0]) throw new WorkspaceWorkerError(409);
  return fallback[0].id;
}

function workerErrorCode(error: unknown) {
  if (error instanceof WorkspaceWorkerError) return `upstream_${error.status}`;
  if (error instanceof Error && error.name === "ZodError")
    return "validation_error";
  return "workspace_materialization_failed";
}

async function markCycleFailed(
  request: ServiceFetch,
  input: { cycleKey: string; error: unknown }
) {
  try {
    await request(
      `/rest/v1/brief_cycles?cycle_key=eq.${encodeURIComponent(input.cycleKey)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "failed",
          finished_at: new Date().toISOString(),
          note: `Automatic publication stopped safely: ${workerErrorCode(input.error)}`,
        }),
      }
    );
  } catch {
    // Preserve the original failure. A later run retains the database-level
    // refresh kill switch and will not expose this incomplete cycle.
  }
}

export async function materializeWorkspaceCycle(input: {
  configuration: ServiceRoleConfiguration;
  runId: string;
  cycleKey: string;
  scheduledFor: string;
  sourceCount: number;
  request?: typeof fetch;
  generateIdea?: typeof generateWorkspaceIdea;
  generateExpansion?: typeof generateWorkspaceExpansion;
}) {
  const request = createServiceRoleFetch(
    input.configuration,
    input.request,
    status => new WorkspaceWorkerError(status)
  );
  let cycleId: string | undefined;
  try {
    const candidates = await jsonRows<CandidateRow>(
      request,
      `/rest/v1/global_refresh_candidates?select=id,document_id,model_id,candidate_payload&run_id=eq.${encodeURIComponent(input.runId)}&analysis_status=eq.accepted&order=created_at.asc&limit=${MAX_WORKSPACE_CHANGES + 1}`
    );
    if (candidates.length > MAX_WORKSPACE_CHANGES) {
      throw new WorkspaceWorkerError(422);
    }
    const documentIds = candidates.map(candidate => candidate.document_id);
    const documents = documentIds.length
      ? await jsonRows<DocumentRow>(
          request,
          `/rest/v1/global_refresh_documents?select=id,source_id,official_record_url,published_at,content_sha256&id=${postgrestIn(documentIds)}&limit=${MAX_WORKSPACE_CHANGES}`
        )
      : [];
    const sourceIds = [
      ...new Set(documents.map(document => document.source_id)),
    ];
    const sources = sourceIds.length
      ? await jsonRows<SourceRow>(
          request,
          `/rest/v1/global_approved_sources?select=id,name,jurisdiction_id,is_enabled&id=${postgrestIn(sourceIds)}&is_enabled=eq.true&limit=${MAX_WORKSPACE_CHANGES}`
        )
      : [];
    const jurisdictionIds = [
      ...new Set(sources.map(source => source.jurisdiction_id)),
    ];
    const jurisdictions = jurisdictionIds.length
      ? await jsonRows<JurisdictionRow>(
          request,
          `/rest/v1/jurisdictions?select=id,code&id=${postgrestIn(jurisdictionIds)}&limit=${MAX_WORKSPACE_CHANGES}`
        )
      : [];
    const documentsById = new Map(
      documents.map(document => [document.id, document])
    );
    const sourcesById = new Map(sources.map(source => [source.id, source]));
    const jurisdictionsById = new Map(
      jurisdictions.map(jurisdiction => [jurisdiction.id, jurisdiction])
    );
    cycleId = await findOrCreateCycle(request, {
      key: input.cycleKey,
      scheduledFor: input.scheduledFor,
      sourceCount: input.sourceCount,
    });
    let changeCount = 0;
    let ideaCount = 0;
    let heldCount = 0;
    const generateIdea = input.generateIdea ?? generateWorkspaceIdea;
    const generateExpansion =
      input.generateExpansion ?? generateWorkspaceExpansion;

    for (const candidate of candidates) {
      const parsed = PolicySignalSchema.safeParse(candidate.candidate_payload);
      const document = documentsById.get(candidate.document_id);
      const source = document ? sourcesById.get(document.source_id) : undefined;
      const jurisdiction = source
        ? jurisdictionsById.get(source.jurisdiction_id)
        : undefined;
      if (
        !parsed.success ||
        !document ||
        !source ||
        !source.is_enabled ||
        !jurisdiction ||
        parsed.data.confidence < MIN_AUTOMATIC_PUBLICATION_CONFIDENCE
      ) {
        heldCount += 1;
        continue;
      }
      const signal = parsed.data;
      const changeResponse = await request(
        "/rest/v1/brief_changes?on_conflict=cycle_id%2Ccontent_sha256",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            cycle_id: cycleId,
            source_candidate_id: candidate.id,
            jurisdiction_id: jurisdiction.id,
            headline: signal.headline.slice(0, 240),
            summary: signal.summary.slice(0, 2000),
            change_type: changeType(signal.signalType),
            importance: importance(signal.confidence),
            topics: classifyWorkspaceTopics({
              headline: signal.headline,
              summary: signal.summary,
            }),
            canonical_url: document.official_record_url,
            published_at: document.published_at ?? input.scheduledFor,
            source_name: source.name.slice(0, 180),
            content_sha256: document.content_sha256,
            is_public: true,
          }),
        }
      );
      const changeRows = (await changeResponse.json()) as Array<{ id: string }>;
      const changeId = changeRows[0]?.id;
      if (!changeId) continue;
      changeCount += 1;
      const change: WorkspaceChangeInput = {
        headline: signal.headline,
        summary: signal.summary,
        changeType: changeType(signal.signalType),
        importance: importance(signal.confidence),
        jurisdiction: jurisdiction.code,
        sourceName: source.name,
        canonicalUrl: document.official_record_url,
      };
      const idea = await generateIdea(change);
      if (!idea) continue;
      const ideaResponse = await request(
        "/rest/v1/brief_ideas?on_conflict=change_id",
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            change_id: changeId,
            title: idea.title,
            summary: idea.summary,
            rationale: idea.rationale,
            confidence: idea.confidence,
            model_id: idea.modelId ?? candidate.model_id,
            prompt_version: idea.promptVersion,
            is_public: true,
          }),
        }
      );
      const ideaRows = (await ideaResponse.json()) as Array<{ id: string }>;
      const ideaId = ideaRows[0]?.id;
      if (!ideaId) continue;
      ideaCount += 1;
      const expansion = await generateExpansion(change, idea);
      if (expansion) {
        await request("/rest/v1/brief_idea_expansions?on_conflict=idea_id", {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            idea_id: ideaId,
            body_markdown: expansion.body_markdown,
            model_id: expansion.modelId ?? idea.modelId ?? candidate.model_id,
            prompt_version: expansion.promptVersion,
            is_public: true,
          }),
        });
      }
    }

    await request(
      `/rest/v1/brief_cycles?cycle_key=eq.${encodeURIComponent(input.cycleKey)}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({
          status: "completed",
          change_count: changeCount,
          idea_count: ideaCount,
          finished_at: new Date().toISOString(),
          note: `Published ${changeCount} source-linked changes; held ${heldCount} candidates below the automatic-publication threshold or without complete active provenance.`,
        }),
      }
    );
    return { cycleId, changeCount, ideaCount, heldCount };
  } catch (error) {
    if (cycleId) {
      await markCycleFailed(request, { cycleKey: input.cycleKey, error });
    }
    throw error;
  }
}

export async function runWorkspaceCycle(
  input: {
    now?: Date;
    workerId?: string;
    sourceFetch?: typeof fetch;
    request?: typeof fetch;
    executionKey?: string;
  } = {}
) {
  const environment = parseRefreshWorkerEnv();
  const now = input.now ?? new Date();
  const workerResult = await runDailyRefreshWorker({
    repository: createRefreshWorkerRepository(
      {
        supabaseUrl: environment.SUPABASE_URL,
        serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
      },
      input.request
    ),
    now,
    workerId: input.workerId,
    sourceFetch: input.sourceFetch,
    executionKey: input.executionKey,
  });
  if (workerResult.status !== "completed") return workerResult;
  const workspaceResult = await materializeWorkspaceCycle({
    configuration: {
      supabaseUrl: environment.SUPABASE_URL,
      serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
    },
    runId: workerResult.runId,
    cycleKey: cycleKey(now),
    scheduledFor: now.toISOString(),
    sourceCount: workerResult.documentCount,
    request: input.request,
  });
  return { ...workerResult, ...workspaceResult };
}

async function main() {
  const result = await runWorkspaceCycle({
    executionKey: process.env.WORKER_EXECUTION_KEY?.trim() || undefined,
  });
  console.info(`[brief] workspace cycle finished: ${result.status}`);
  if (result.status === "failed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  new URL(`file://${process.argv[1]}`).href === import.meta.url
) {
  void main().catch(error => {
    console.error("[brief] workspace cycle failed", {
      kind: error instanceof Error ? error.name : "unknown_error",
    });
    process.exitCode = 1;
  });
}
