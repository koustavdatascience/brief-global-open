import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicApiError, listPublicSignals } from "./publicApi";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("public API client", () => {
  it("requests only the bounded anonymous public signal endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listPublicSignals()).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/signals?limit=12&offset=0",
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
  });

  it("does not expose upstream response details on a failed request", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(new Response("upstream detail", { status: 503 }))
    );
    await expect(listPublicSignals()).rejects.toEqual(
      expect.objectContaining<Partial<PublicApiError>>({
        name: "PublicApiError",
        status: 503,
        message: "The public Brief API request failed.",
      })
    );
  });
});
