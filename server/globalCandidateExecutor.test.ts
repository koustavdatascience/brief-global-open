import { describe, expect, it, vi } from "vitest";
import {
  executeGlobalCandidateAnalysis,
  GlobalCandidateExecutorError,
  MAX_GLOBAL_CANDIDATE_SOURCE_BYTES,
} from "./globalCandidateExecutor";

const source = {
  id: "source-1",
  canonicalUrl: "https://www.federalregister.gov/api/v1/documents.json",
  jurisdictionCode: "USA",
  sourceLanguage: "en",
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
  headline: "A consultation is open",
  summary:
    "The official document describes a consultation with a defined policy scope and response pathway.",
  effectiveDate: null,
  entities: ["Agency"],
  jurisdictions: ["USA"],
  actionRequired: null,
  confidence: 0.7,
  evidence: [{ quote: "The consultation is open.", locator: "Introduction" }],
};

describe("global candidate executor", () => {
  it("processes one bounded same-origin document into a non-public analysis result", async () => {
    const request = vi.fn().mockResolvedValue(
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
    );
    const result = await executeGlobalCandidateAnalysis(
      source,
      {
        sourceDocumentUrl:
          "https://www.federalregister.gov/documents/2026/08/23/example",
        officialRecordUrl:
          "https://www.federalregister.gov/documents/2026/08/23/example",
        title: "Example official document",
        publishedAt: "2026-08-23T00:00:00.000Z",
        sourceText: "The consultation is open.",
      },
      { fetch: request, providerConfiguration }
    );

    expect(result.document).toMatchObject({
      byteSize: 25,
      title: "Example official document",
    });
    expect(result.document.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.analysis.outcome).toMatchObject({ status: "accepted" });
    expect(result).not.toHaveProperty("publication");
  });

  it("rejects redirects or record URLs outside the approved source origin", async () => {
    await expect(
      executeGlobalCandidateAnalysis(source, {
        sourceDocumentUrl: "https://evil.example/record",
        officialRecordUrl: "https://evil.example/record",
        title: "Unexpected record",
        publishedAt: null,
        sourceText: "The authority says something.",
      })
    ).rejects.toMatchObject({ code: "host_not_approved" });
  });

  it("rejects oversized source text before model invocation", async () => {
    const request = vi.fn();
    await expect(
      executeGlobalCandidateAnalysis(
        source,
        {
          sourceDocumentUrl:
            "https://www.federalregister.gov/documents/example",
          officialRecordUrl:
            "https://www.federalregister.gov/documents/example",
          title: "Large record",
          publishedAt: null,
          sourceText: "x".repeat(MAX_GLOBAL_CANDIDATE_SOURCE_BYTES + 1),
        },
        { fetch: request, providerConfiguration }
      )
    ).rejects.toMatchObject({ code: "source_too_large" });
    expect(request).not.toHaveBeenCalled();
  });
});
