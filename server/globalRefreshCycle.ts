import {
  executeGlobalCandidateAnalysis,
  type ApprovedGlobalSource,
  type BoundedGlobalDocument,
} from "./globalCandidateExecutor";
import type { GlobalCandidateAnalysisDependencies } from "./globalCandidateAnalysis";

export type GlobalRefreshCycleConfiguration = {
  isEnabled: boolean;
  executorStatus: "not_ready" | "ready" | "paused";
};

export type CycleSource = ApprovedGlobalSource & {
  isEnabled: boolean;
  sourceKind: "website" | "rss" | "document_feed" | "api";
};

export type GlobalRefreshCycleDependencies = {
  fetchDocuments: (
    source: CycleSource
  ) => Promise<readonly BoundedGlobalDocument[]>;
  persistCandidate: (
    sourceId: string,
    execution: Awaited<ReturnType<typeof executeGlobalCandidateAnalysis>>
  ) => Promise<"created" | "existing">;
  analysis?: GlobalCandidateAnalysisDependencies;
};

export type GlobalRefreshCycleResult =
  | {
      status: "not_ready";
      reason: "configuration_disabled" | "executor_not_ready";
    }
  | {
      status: "completed";
      sourceCount: number;
      documentCount: number;
      candidateCount: number;
      existingCandidateCount: number;
      failedDocumentCount: number;
    };

/**
 * Coordinates a manually initiated refresh only after a caller has loaded a
 * reviewed configuration and bounded documents. It neither discovers sources
 * nor writes public signals, sends email, or creates a scheduler task.
 */
export async function runApprovedGlobalRefreshCycle(
  configuration: GlobalRefreshCycleConfiguration,
  sources: readonly CycleSource[],
  dependencies: GlobalRefreshCycleDependencies
): Promise<GlobalRefreshCycleResult> {
  if (!configuration.isEnabled)
    return { status: "not_ready", reason: "configuration_disabled" };
  if (configuration.executorStatus !== "ready")
    return { status: "not_ready", reason: "executor_not_ready" };

  let documentCount = 0;
  let candidateCount = 0;
  let existingCandidateCount = 0;
  let failedDocumentCount = 0;
  const enabledSources = sources.filter(source => source.isEnabled);

  for (const source of enabledSources) {
    const documents = await dependencies.fetchDocuments(source);
    for (const document of documents) {
      documentCount += 1;
      try {
        const execution = await executeGlobalCandidateAnalysis(
          source,
          document,
          dependencies.analysis
        );
        const disposition = await dependencies.persistCandidate(
          source.id,
          execution
        );
        if (
          disposition === "created" &&
          execution.analysis.outcome.status === "accepted"
        )
          candidateCount += 1;
        if (disposition === "existing") existingCandidateCount += 1;
      } catch {
        failedDocumentCount += 1;
      }
    }
  }

  return {
    status: "completed",
    sourceCount: enabledSources.length,
    documentCount,
    candidateCount,
    existingCandidateCount,
    failedDocumentCount,
  };
}
