import { describe, expect, it, vi } from "vitest";
import { materializeWorkspaceCycle } from "./workspaceWorker";

const configuration = {
  supabaseUrl: "https://example.supabase.co",
  serviceRoleKey: "service-role-test-key",
};

const signal = (confidence = 0.92) => ({
  signalType: "regulatory_change",
  headline: "A source-backed policy change",
  summary: "A concise summary grounded in the official source.",
  effectiveDate: null,
  entities: ["Agency"],
  jurisdictions: ["EU"],
  actionRequired: null,
  confidence,
  evidence: [{ quote: "Official source evidence", locator: "Section 1" }],
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function workspaceFetch(input: {
  candidatePayloads?: unknown[];
  sources?: unknown[];
  existingCycle?: boolean;
  failChangeWrite?: boolean;
}) {
  const requests: Array<{ path: string; init?: RequestInit }> = [];
  const request: typeof fetch = async (resource, init) => {
    const path = String(resource);
    requests.push({ path, init });
    if (path.includes("global_refresh_candidates")) {
      return jsonResponse(
        (input.candidatePayloads ?? [signal()]).map(
          (candidate_payload, index) => ({
            id: `candidate-${index + 1}`,
            document_id: `document-${index + 1}`,
            model_id: "model-1",
            candidate_payload,
          })
        )
      );
    }
    if (path.includes("global_refresh_documents")) {
      return jsonResponse([
        {
          id: "document-1",
          source_id: "source-1",
          official_record_url: "https://agency.example/policy",
          published_at: "2026-08-24T00:00:00.000Z",
          content_sha256: "a".repeat(64),
        },
      ]);
    }
    if (path.includes("global_approved_sources")) {
      return jsonResponse(
        input.sources ?? [
          {
            id: "source-1",
            name: "Official Agency",
            jurisdiction_id: "jurisdiction-1",
            is_enabled: true,
          },
        ]
      );
    }
    if (path.includes("/jurisdictions")) {
      return jsonResponse([{ id: "jurisdiction-1", code: "EU" }]);
    }
    if (path.includes("brief_cycles?select=id")) {
      return jsonResponse(input.existingCycle ? [{ id: "cycle-1" }] : []);
    }
    if (path.endsWith("/brief_cycles") && init?.method === "POST") {
      return jsonResponse([{ id: "cycle-1" }]);
    }
    if (path.includes("/brief_changes") && init?.method === "POST") {
      return input.failChangeWrite
        ? jsonResponse({ error: "failed" }, 500)
        : jsonResponse([{ id: "change-1" }]);
    }
    if (path.includes("/brief_ideas") && init?.method === "POST") {
      return jsonResponse([{ id: "idea-1" }]);
    }
    return jsonResponse([]);
  };
  return { request, requests };
}

async function materialize(
  fetchInput: Parameters<typeof workspaceFetch>[0],
  overrides: Partial<Parameters<typeof materializeWorkspaceCycle>[0]> = {}
) {
  const { request, requests } = workspaceFetch(fetchInput);
  const result = materializeWorkspaceCycle({
    configuration,
    runId: "run-1",
    cycleKey: "brief-workspace-cycle:2026-08-24",
    scheduledFor: "2026-08-24T03:30:00.000Z",
    sourceCount: 1,
    request,
    generateIdea: vi.fn().mockResolvedValue(null),
    generateExpansion: vi.fn().mockResolvedValue(null),
    ...overrides,
  });
  return { result, requests };
}

describe("workspace automatic publication", () => {
  it("holds an accepted candidate below the stricter automatic-publication threshold", async () => {
    const { result, requests } = await materialize({
      candidatePayloads: [signal(0.79)],
    });

    await expect(result).resolves.toMatchObject({
      changeCount: 0,
      ideaCount: 0,
      heldCount: 1,
    });
    expect(
      requests.some(
        entry =>
          entry.path.includes("/brief_changes") && entry.init?.method === "POST"
      )
    ).toBe(false);
    const completed = requests.find(
      entry =>
        entry.path.includes("brief_cycles?cycle_key") &&
        entry.init?.method === "PATCH"
    );
    expect(completed?.init?.body).toContain('"status":"completed"');
  });

  it("refuses a candidate whose linked source is no longer enabled", async () => {
    const { result, requests } = await materialize({ sources: [] });

    await expect(result).resolves.toMatchObject({
      changeCount: 0,
      heldCount: 1,
    });
    expect(
      requests.some(
        entry =>
          entry.path.includes("/brief_changes") && entry.init?.method === "POST"
      )
    ).toBe(false);
  });

  it("fails closed before creating a cycle when a run exceeds the publication limit", async () => {
    const { result, requests } = await materialize({
      candidatePayloads: Array.from({ length: 13 }, () => signal()),
    });

    await expect(result).rejects.toThrow("422");
    expect(
      requests.some(
        entry =>
          entry.path.endsWith("/brief_cycles") && entry.init?.method === "POST"
      )
    ).toBe(false);
  });

  it("reuses an existing cycle key to preserve retry idempotency", async () => {
    const { result, requests } = await materialize({ existingCycle: true });

    await expect(result).resolves.toMatchObject({ cycleId: "cycle-1" });
    expect(
      requests.some(
        entry =>
          entry.path.endsWith("/brief_cycles") && entry.init?.method === "POST"
      )
    ).toBe(false);
  });

  it("marks a started cycle failed if a write cannot be completed", async () => {
    const { result, requests } = await materialize({ failChangeWrite: true });

    await expect(result).rejects.toThrow("500");
    const failed = requests.find(
      entry =>
        entry.path.includes("brief_cycles?cycle_key") &&
        entry.init?.method === "PATCH" &&
        entry.init.body?.toString().includes('"status":"failed"')
    );
    expect(failed?.init?.body).toContain("upstream_500");
  });
});
