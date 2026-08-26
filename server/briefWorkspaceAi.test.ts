import { describe, expect, it } from "vitest";
import {
  generateWorkspaceExpansion,
  generateWorkspaceIdea,
  readWorkspaceAiConfiguration,
  type WorkspaceAiConfiguration,
  type WorkspaceChangeInput,
} from "./briefWorkspaceAi";

const change: WorkspaceChangeInput = {
  headline: "The agency publishes a new evidence requirement",
  summary:
    "The agency published a source-linked requirement affecting a defined operational workflow.",
  changeType: "regulation",
  importance: "material",
  jurisdiction: "EU",
  sourceName: "European Commission",
  canonicalUrl: "https://example.eu/policy",
};

const configuration: WorkspaceAiConfiguration = {
  geminiApiKey: "gemini-test-key",
  geminiModel: "gemini-2.5-flash",
  openRouterApiKey: "openrouter-test-key",
  openRouterModel: "minimax/minimax-m3:free",
  groqApiKey: "groq-test-key",
  groqModel: "openai/gpt-oss-20b",
};

function geminiResponse(value: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify(value) }] } }],
    }),
    { status }
  );
}

function chatResponse(value: unknown, status = 200) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(value) } }],
    }),
    { status }
  );
}

function ideaValue() {
  return {
    title: "Policy Evidence Control Plane",
    summary:
      "A source-linked workflow system that maps policy evidence to accountable operational decisions.",
    rationale:
      "It reduces repeated review work while preserving evidence lineage, approval controls, and measurable operational outcomes.",
    confidence: 0.91,
  };
}

describe("workspace AI provider rotation", () => {
  it("moves from exhausted providers to Groq and accepts its validated idea output", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const request: typeof fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >;
      calls.push({ url: String(input), body });
      if (calls.length === 1) return geminiResponse({}, 429);
      if (calls.length <= 4) return chatResponse({}, 429);
      return chatResponse(ideaValue());
    };

    const result = await generateWorkspaceIdea(change, {
      fetch: request,
      configuration: () => configuration,
    });

    expect(result?.modelId).toBe("openai/gpt-oss-20b");
    expect(calls.map(call => call.url)).toEqual([
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      "https://openrouter.ai/api/v1/chat/completions",
      "https://openrouter.ai/api/v1/chat/completions",
      "https://openrouter.ai/api/v1/chat/completions",
      "https://api.groq.com/openai/v1/chat/completions",
    ]);
    expect(calls[1]?.body.model).toBe("minimax/minimax-m3:free");
    expect(calls[2]?.body.model).toBe(
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
    );
    expect(calls[3]?.body.model).toBe("poolside/laguna-s-2.1:free");
    expect(calls[1]?.body.response_format).toEqual({ type: "json_object" });
    expect(calls[2]?.body.response_format).toBeUndefined();
    expect(calls[3]?.body.response_format).toBeUndefined();
  });

  it("uses the grounded architecture fallback after every provider is exhausted", async () => {
    const calls: string[] = [];
    const request: typeof fetch = async input => {
      calls.push(String(input));
      return new Response("provider unavailable", { status: 429 });
    };

    const result = await generateWorkspaceExpansion(
      change,
      {
        title: "Policy Evidence Control Plane",
        summary:
          "A source-linked workflow system that maps policy evidence to accountable operational decisions.",
        rationale:
          "It reduces repeated review work while preserving evidence lineage, approval controls, and measurable operational outcomes.",
      },
      { fetch: request, configuration: () => configuration }
    );

    expect(result?.modelId).toBe("grounded-fallback");
    expect(result?.body_markdown.length).toBeGreaterThanOrEqual(3500);
    expect(result?.body_markdown).toContain("## Users and operating model");
    expect(result?.body_markdown).toContain("## Observability and operations");
    expect(result?.body_markdown).toContain("## Deployment topology");
    expect(calls).toHaveLength(5);
  });

  it("keeps the Groq model configurable while defaulting it for existing deployments", () => {
    const result = readWorkspaceAiConfiguration({
      GEMINI_API_KEY: "gemini",
      OPENROUTER_API_KEY: "openrouter",
      GROQ_API_KEY: "groq",
    });

    expect(result.groqApiKey).toBe("groq");
    expect(result.groqModel).toBe("openai/gpt-oss-20b");
  });
});
