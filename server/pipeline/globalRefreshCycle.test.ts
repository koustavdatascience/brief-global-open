import { describe, expect, it, vi } from "vitest";
import { runApprovedGlobalRefreshCycle } from "./globalRefreshCycle";

const source = {
  id: "source-1",
  canonicalUrl: "https://authority.example/api",
  jurisdictionCode: "USA",
  sourceLanguage: "en",
  sourceKind: "api" as const,
  isEnabled: true,
};
const document = {
  sourceDocumentUrl: "https://authority.example/documents/1",
  officialRecordUrl: "https://authority.example/documents/1",
  title: "Official document",
  publishedAt: null,
  sourceText: "The authority opens a policy consultation.",
};
const providerConfiguration = () => ({
  geminiApiKey: "test-gemini-key",
  geminiModel: "gemini-test",
  openRouterApiKey: "test-openrouter-key",
  openRouterModel: "openrouter-test",
  groqApiKey: "test-groq-key",
  groqModel: "groq-test",
});

const structuredCandidate = {
  signalType: "consultation",
  headline: "A policy consultation opens",
  summary:
    "The official authority announces a consultation with a defined policy scope and response process.",
  effectiveDate: null,
  entities: ["Authority"],
  jurisdictions: ["USA"],
  actionRequired: null,
  confidence: 0.7,
  evidence: [{ quote: "A policy consultation opens.", locator: "Opening" }],
};

describe("approved global refresh cycle", () => {
  it("does not fetch, analyze, persist, publish, or schedule anything while the configuration is disabled", async () => {
    const fetchDocuments = vi.fn();
    const persistCandidate = vi.fn();
    const result = await runApprovedGlobalRefreshCycle(
      { isEnabled: false, executorStatus: "not_ready" },
      [source],
      { fetchDocuments, persistCandidate }
    );
    expect(result).toEqual({
      status: "not_ready",
      reason: "configuration_disabled",
    });
    expect(fetchDocuments).not.toHaveBeenCalled();
    expect(persistCandidate).not.toHaveBeenCalled();
  });

  it("creates a non-public accepted candidate only after an explicitly ready manual configuration", async () => {
    const fetchDocuments = vi.fn().mockResolvedValue([document]);
    const persistCandidate = vi.fn().mockResolvedValue("created");
    const result = await runApprovedGlobalRefreshCycle(
      { isEnabled: true, executorStatus: "ready" },
      [source],
      {
        fetchDocuments,
        persistCandidate,
        analysis: {
          fetch: vi.fn().mockResolvedValue(
            new Response(
              JSON.stringify({
                candidates: [
                  {
                    content: {
                      parts: [{ text: JSON.stringify(structuredCandidate) }],
                    },
                  },
                ],
              })
            )
          ),
          providerConfiguration,
        },
      }
    );
    expect(result).toEqual({
      status: "completed",
      sourceCount: 1,
      documentCount: 1,
      candidateCount: 1,
      existingCandidateCount: 0,
      failedDocumentCount: 0,
    });
    expect(persistCandidate).toHaveBeenCalledTimes(1);
    expect(result).not.toHaveProperty("published");
  });
});
