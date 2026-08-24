import { describe, expect, it, vi } from "vitest";
import { parseRefreshWorkerEnv, runDailyRefreshWorker } from "./refreshWorker";
import type { RefreshWorkerRepository } from "./refreshWorkerRepository";

function repository(
  overrides: Partial<RefreshWorkerRepository> = {}
): RefreshWorkerRepository {
  return {
    getConfiguration: async () => ({
      isEnabled: false,
      executorStatus: "not_ready",
    }),
    getApprovedSources: async () => [],
    claimRun: async () => ({ id: "run-1", claimed: true }),
    finishRun: async () => undefined,
    persistCandidate: async () => "created",
    ...overrides,
  };
}

describe("finite daily refresh worker", () => {
  it("requires all direct-provider credentials before a host can invoke the worker command", () => {
    expect(() =>
      parseRefreshWorkerEnv({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "x".repeat(20),
      })
    ).toThrow();
    expect(
      parseRefreshWorkerEnv({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "x".repeat(20),
        GEMINI_API_KEY: "x".repeat(20),
        OPENROUTER_API_KEY: "x".repeat(20),
        GROQ_API_KEY: "x".repeat(20),
      })
    ).toMatchObject({ SUPABASE_URL: "https://example.supabase.co" });
  });

  it("fails closed without fetching sources or calling providers when the configuration is disabled", async () => {
    const sourceFetch = vi.fn();
    const analysisFetch = vi.fn();
    const result = await runDailyRefreshWorker({
      repository: repository(),
      sourceFetch,
      analysis: { fetch: analysisFetch },
    });

    expect(result).toEqual({
      status: "not_ready",
      reason: "configuration_disabled",
    });
    expect(sourceFetch).not.toHaveBeenCalled();
    expect(analysisFetch).not.toHaveBeenCalled();
  });

  it("does not repeat an already claimed daily run", async () => {
    const sourceFetch = vi.fn();
    const result = await runDailyRefreshWorker({
      repository: repository({
        getConfiguration: async () => ({
          isEnabled: true,
          executorStatus: "ready",
        }),
        getApprovedSources: async () => [],
        claimRun: async () => ({ id: "run-1", claimed: false }),
      }),
      sourceFetch,
      now: new Date("2026-08-23T18:30:00.000Z"),
    });

    expect(result).toEqual({ status: "already_claimed", runId: "run-1" });
    expect(sourceFetch).not.toHaveBeenCalled();
  });

  it("uses an explicit execution key for a controlled manual run", async () => {
    const claimRun = vi.fn().mockResolvedValue({ id: "run-1", claimed: true });
    await runDailyRefreshWorker({
      repository: repository({
        getConfiguration: async () => ({
          isEnabled: true,
          executorStatus: "ready",
        }),
        claimRun,
      }),
      executionKey: "brief-external-refresh:manual-2026-08-24",
    });

    expect(claimRun).toHaveBeenCalledWith(
      expect.objectContaining({
        executionKey: "brief-external-refresh:manual-2026-08-24",
      })
    );
  });

  it("finishes a claimed empty approved-source cycle without publishing anything", async () => {
    const finishRun = vi.fn().mockResolvedValue(undefined);
    const result = await runDailyRefreshWorker({
      repository: repository({
        getConfiguration: async () => ({
          isEnabled: true,
          executorStatus: "ready",
        }),
        getApprovedSources: async () => [],
        finishRun,
      }),
      now: new Date("2026-08-23T18:30:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "completed",
      runId: "run-1",
      candidateCount: 0,
      documentCount: 0,
    });
    expect(finishRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        note: expect.stringContaining("no publication"),
      })
    );
  });
});
