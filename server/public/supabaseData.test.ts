import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = global.fetch;

async function loadDataClient() {
  vi.resetModules();
  vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test_key");
  return import("./supabaseData");
}

describe("Supabase public data client", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sends an opaque publishable key only in the apikey header for anonymous reads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    global.fetch = fetchMock;
    const { supabasePublicFetch } = await loadDataClient();

    await supabasePublicFetch("/rest/v1/jurisdictions?select=id");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({
      apikey: "sb_publishable_test_key",
      "Content-Type": "application/json",
    });
    expect(options.headers).not.toHaveProperty("Authorization");
  });

  it("retains a user JWT as the authorization header for user-scoped reads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]"));
    global.fetch = fetchMock;
    const { supabaseUserFetch } = await loadDataClient();

    await supabaseUserFetch("/rest/v1/preferences", "user-jwt");

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(options.headers).toMatchObject({
      apikey: "sb_publishable_test_key",
      Authorization: "Bearer user-jwt",
    });
  });
});
