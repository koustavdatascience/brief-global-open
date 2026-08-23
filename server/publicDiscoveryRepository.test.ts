import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listPublicJurisdictions,
  listPublicSignals,
} from "./publicDiscoveryRepository";

afterEach(() => vi.unstubAllGlobals());

describe("public discovery repository", () => {
  it("queries only the curated public projection with bounded pagination", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementation(
        () => new Response(JSON.stringify([]), { status: 200 })
      );
    vi.stubGlobal("fetch", fetchMock);

    await listPublicJurisdictions(100);
    await listPublicSignals({ jurisdictionCode: "IND", limit: 99, offset: -4 });

    expect(fetchMock.mock.calls[0]?.[0]).toContain("/rest/v1/jurisdictions?");
    expect(fetchMock.mock.calls[0]?.[0]).toContain("limit=64");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/rest/v1/public_signals?");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("jurisdictions.code=eq.IND");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("limit=24");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("offset=0");
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain("workspace_id");
    expect(fetchMock.mock.calls[1]?.[0]).not.toContain("source_documents");
  });
});
