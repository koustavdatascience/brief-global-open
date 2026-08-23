import { describe, expect, it, vi } from "vitest";
import { createRefreshWorkerRepository } from "./refreshWorkerRepository";

describe("service-role refresh repository", () => {
  it("uses the service key only in server-side requests and reads private execution configuration", async () => {
    const request = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([{ is_enabled: false, executor_status: "not_ready" }]),
          { status: 200 }
        )
      );
    const repository = createRefreshWorkerRepository(
      {
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-test-key",
      },
      request
    );

    await expect(repository.getConfiguration()).resolves.toEqual({
      isEnabled: false,
      executorStatus: "not_ready",
    });
    expect(request).toHaveBeenCalledWith(
      "https://example.supabase.co/rest/v1/global_refresh_configuration?select=is_enabled,executor_status&id=eq.true&limit=1",
      expect.objectContaining({
        headers: expect.objectContaining({
          apikey: "service-role-test-key",
          Authorization: "Bearer service-role-test-key",
        }),
      })
    );
  });
});
