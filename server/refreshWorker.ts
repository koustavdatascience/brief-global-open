import { z } from "zod";
import { fetchFederalRegisterDocuments } from "./federalRegisterAdapter";
import type { GlobalCandidateAnalysisDependencies } from "./globalCandidateAnalysis";
import {
  runApprovedGlobalRefreshCycle,
  type CycleSource,
} from "./globalRefreshCycle";
import {
  createRefreshWorkerRepository,
  type RefreshWorkerRepository,
  type WorkerApprovedSource,
} from "./refreshWorkerRepository";

const workerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  GEMINI_API_KEY: z.string().min(20),
  OPENROUTER_API_KEY: z.string().min(20),
  GROQ_API_KEY: z.string().min(20),
  WORKER_ID: z.string().min(3).max(160).optional(),
});

export type RefreshWorkerEnv = z.infer<typeof workerEnvSchema>;
export type DailyWorkerResult =
  | {
      status: "not_ready";
      reason: "configuration_disabled" | "executor_not_ready";
    }
  | { status: "already_claimed"; runId: string }
  | {
      status: "completed";
      runId: string;
      candidateCount: number;
      documentCount: number;
      existingCandidateCount: number;
      failedDocumentCount: number;
    }
  | { status: "failed"; runId: string };

export function parseRefreshWorkerEnv(
  input: NodeJS.ProcessEnv = process.env
): RefreshWorkerEnv {
  return workerEnvSchema.parse(input);
}

function indiaCalendarDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(part => part.type === type)?.value ?? "00";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

type FederalRegisterCycleSource = Pick<
  CycleSource,
  "id" | "canonicalUrl" | "sourceKind" | "jurisdictionCode" | "sourceLanguage"
> & { sourceKind: "api"; jurisdictionCode: "USA" };

function isFederalRegisterSource(
  source: Pick<CycleSource, "canonicalUrl" | "sourceKind" | "jurisdictionCode">
): source is FederalRegisterCycleSource {
  return (
    source.sourceKind === "api" &&
    source.jurisdictionCode === "USA" &&
    source.canonicalUrl ===
      "https://www.federalregister.gov/api/v1/documents.json"
  );
}

async function fetchBoundedApprovedDocuments(
  source: CycleSource,
  request: typeof fetch
) {
  if (!isFederalRegisterSource(source))
    throw new Error("unsupported_approved_source");
  return fetchFederalRegisterDocuments(source, request);
}

export async function runDailyRefreshWorker(input: {
  repository: RefreshWorkerRepository;
  now?: Date;
  workerId?: string;
  sourceFetch?: typeof fetch;
  analysis?: GlobalCandidateAnalysisDependencies;
  executionKey?: string;
}): Promise<DailyWorkerResult> {
  const now = input.now ?? new Date();
  const [configuration, approvedSources] = await Promise.all([
    input.repository.getConfiguration(),
    input.repository.getApprovedSources(),
  ]);
  if (!configuration.isEnabled)
    return { status: "not_ready", reason: "configuration_disabled" };
  if (configuration.executorStatus !== "ready")
    return { status: "not_ready", reason: "executor_not_ready" };

  const sources = approvedSources.map((source): CycleSource => ({ ...source }));
  const claim = await input.repository.claimRun({
    executionKey:
      input.executionKey ?? `brief-external-refresh:${indiaCalendarDate(now)}`,
    sourceCount: sources.length,
    scheduledFor: now.toISOString(),
    workerId: input.workerId ?? "brief-external-worker",
  });
  if (!claim.claimed) return { status: "already_claimed", runId: claim.id };

  try {
    const result = await runApprovedGlobalRefreshCycle(configuration, sources, {
      fetchDocuments: source =>
        fetchBoundedApprovedDocuments(source, input.sourceFetch ?? fetch),
      analysis: input.analysis,
      persistCandidate: async (sourceId, execution) =>
        (await input.repository.persistCandidate({
          runId: claim.id,
          sourceId,
          execution,
        })) === "created"
          ? "created"
          : "existing",
    });
    if (result.status !== "completed") {
      await input.repository.finishRun({
        runId: claim.id,
        status: "failed",
        candidateCount: 0,
        note: `External worker stopped: ${result.reason}; no publication.`,
      });
      return { status: "failed", runId: claim.id };
    }
    await input.repository.finishRun({
      runId: claim.id,
      status: "completed",
      candidateCount: result.candidateCount,
      note: "External approved-source candidate analysis completed; no publication.",
    });
    return {
      status: "completed",
      runId: claim.id,
      candidateCount: result.candidateCount,
      documentCount: result.documentCount,
      existingCandidateCount: result.existingCandidateCount,
      failedDocumentCount: result.failedDocumentCount,
    };
  } catch {
    await input.repository.finishRun({
      runId: claim.id,
      status: "failed",
      candidateCount: 0,
      note: "External approved-source candidate analysis failed; no publication.",
    });
    return { status: "failed", runId: claim.id };
  }
}

async function main() {
  const environment = parseRefreshWorkerEnv();
  const result = await runDailyRefreshWorker({
    repository: createRefreshWorkerRepository({
      supabaseUrl: environment.SUPABASE_URL,
      serviceRoleKey: environment.SUPABASE_SERVICE_ROLE_KEY,
    }),
    workerId: environment.WORKER_ID,
  });
  console.info(`[brief] daily refresh worker finished: ${result.status}`);
  if (result.status === "failed") process.exitCode = 1;
}

if (
  process.argv[1] &&
  new URL(`file://${process.argv[1]}`).href === import.meta.url
) {
  void main().catch(() => {
    process.exitCode = 1;
  });
}
