import { canonicalizeHttpsUrl, sha256 } from "./collectionEngine";
import {
  analyzeGlobalCandidate,
  type GlobalCandidateAnalysisDependencies,
  type GlobalCandidateAnalysisResult,
} from "./globalCandidateAnalysis";

export const MAX_GLOBAL_CANDIDATE_SOURCE_BYTES = 250_000;

export class GlobalCandidateExecutorError extends Error {
  constructor(
    public readonly code:
      "host_not_approved" | "source_too_large" | "invalid_document"
  ) {
    super(code);
  }
}

export type ApprovedGlobalSource = {
  id: string;
  canonicalUrl: string;
  jurisdictionCode: string;
  sourceLanguage: string;
};

export type BoundedGlobalDocument = {
  sourceDocumentUrl: string;
  officialRecordUrl: string;
  title: string;
  publishedAt: string | null;
  sourceText: string;
};

export type GlobalCandidateExecution = {
  document: {
    sourceDocumentUrl: string;
    officialRecordUrl: string;
    title: string;
    publishedAt: string | null;
    contentSha256: string;
    byteSize: number;
  };
  analysis: GlobalCandidateAnalysisResult;
};

function sourceHost(source: ApprovedGlobalSource): string {
  const host = new URL(source.canonicalUrl).hostname.toLowerCase();
  if (!host) throw new GlobalCandidateExecutorError("invalid_document");
  return host;
}

/**
 * This is deliberately a bounded processing step, not a crawler. The caller is
 * responsible for fetching a single approved document before invoking it.
 */
export async function executeGlobalCandidateAnalysis(
  source: ApprovedGlobalSource,
  document: BoundedGlobalDocument,
  dependencies?: GlobalCandidateAnalysisDependencies
): Promise<GlobalCandidateExecution> {
  const allowedHosts = [sourceHost(source)];
  let sourceDocumentUrl: string;
  let officialRecordUrl: string;
  try {
    sourceDocumentUrl = canonicalizeHttpsUrl(
      document.sourceDocumentUrl,
      allowedHosts
    );
    officialRecordUrl = canonicalizeHttpsUrl(
      document.officialRecordUrl,
      allowedHosts
    );
  } catch (error) {
    if (error instanceof Error && error.message === "host_not_approved") {
      throw new GlobalCandidateExecutorError("host_not_approved");
    }
    throw new GlobalCandidateExecutorError("invalid_document");
  }

  const title = document.title.trim();
  const sourceText = document.sourceText.trim();
  const byteSize = new TextEncoder().encode(sourceText).byteLength;
  if (!title || !sourceText)
    throw new GlobalCandidateExecutorError("invalid_document");
  if (byteSize > MAX_GLOBAL_CANDIDATE_SOURCE_BYTES) {
    throw new GlobalCandidateExecutorError("source_too_large");
  }

  const analysis = await analyzeGlobalCandidate(
    sourceText,
    {
      jurisdictionCode: source.jurisdictionCode,
      sourceLanguage: source.sourceLanguage,
    },
    dependencies
  );

  return {
    document: {
      sourceDocumentUrl,
      officialRecordUrl,
      title,
      publishedAt: document.publishedAt,
      contentSha256: sha256(sourceText),
      byteSize,
    },
    analysis,
  };
}
