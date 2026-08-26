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

const ideaSummary =
  "A source-linked workflow system maps policy evidence to affected records, accountable owners, approval gates, and controlled exports. It gives engineering, operations, compliance, and finance teams one durable case record with source versions, evidence status, and measurable resolution outcomes. The first slice ingests one official notice, creates one case, requests missing evidence, and exports an approval-ready record without claiming legal authority.";
const ideaRationale =
  "The defensible value is not another alert or dashboard: it turns uncertain policy updates into traceable operational decisions, with a state machine, provenance, human review, retries, and an auditable handoff to the system of record. The hard part is policy-specific mapping and safe integration failure handling; a focused pilot can test whether it reduces review time and rework.";

function ideaValue() {
  return {
    title: "Policy Evidence Control Plane",
    summary: ideaSummary,
    rationale: ideaRationale,
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
    expect(
      (result?.summary.length ?? 0) + (result?.rationale.length ?? 0)
    ).toBeGreaterThanOrEqual(700);
    expect(
      (result?.summary.length ?? 0) + (result?.rationale.length ?? 0)
    ).toBeLessThanOrEqual(1200);
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
        summary: ideaSummary,
        rationale: ideaRationale,
      },
      { fetch: request, configuration: () => configuration }
    );

    expect(result?.modelId).toBe("grounded-fallback");
    expect(result?.body_markdown.length).toBeGreaterThanOrEqual(4500);
    expect(result?.body_markdown.length).toBeLessThanOrEqual(11500);
    expect(result?.body_markdown).toContain(
      "## System boundary and architecture"
    );
    expect(result?.body_markdown).toContain("## MVP vertical slice");
    expect(calls).toHaveLength(5);
  });

  it("advances after a valid-but-incomplete PRD and accepts a later complete result", async () => {
    const headings = [
      "Plain-language context",
      "What changed",
      "Why it matters",
      "Product concept",
      "System boundary and architecture",
      "Users and operating model",
      "Core workflow and state",
      "Data model and evidence lineage",
      "Integrations and interfaces",
      "Security, compliance, and controls",
      "Observability and operations",
      "Deployment topology",
      "MVP vertical slice",
      "Scale and evolution",
      "Economic logic",
      "Risks and constraints",
      "First 30 days",
      "Official source",
    ];
    const completePrd = headings
      .map(
        heading =>
          `## ${heading}\n${"This proposed workflow uses source-linked evidence, explicit ownership, controlled transitions, measurable recovery outcomes, versioned data, a human approval gate, and a documented failure-recovery path. ".repeat(2)}`
      )
      .join("\n");
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    const request: typeof fetch = async (input, init) => {
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<
        string,
        unknown
      >;
      calls.push({ url: String(input), body });
      if (calls.length === 1)
        return geminiResponse({
          body_markdown: "## Plain-language context\\nToo short",
        });
      if (calls.length <= 4) return chatResponse({}, 429);
      return chatResponse({ body_markdown: completePrd });
    };

    const result = await generateWorkspaceExpansion(
      change,
      {
        title: "Policy Evidence Control Plane",
        summary: ideaSummary,
        rationale: ideaRationale,
      },
      { fetch: request, configuration: () => configuration }
    );

    expect(result?.modelId).toBe("openai/gpt-oss-20b");
    expect(result?.body_markdown).toContain(
      "## System boundary and architecture"
    );
    expect(calls).toHaveLength(5);
    expect(calls[0]?.body.generationConfig).toMatchObject({
      maxOutputTokens: 7200,
    });
    expect(calls[4]?.body.max_tokens).toBe(7200);
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
