import { afterEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import { parsePublicServerEnv } from "./publicEnv";
import { attachProductionStaticRoutes, createPublicApp } from "./publicServer";
import { SupabaseDataError } from "./supabaseData";

async function startServer(app: ReturnType<typeof createPublicApp>) {
  const server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Test server address unavailable.");
  return { server, origin: `http://127.0.0.1:${address.port}` };
}

describe("portable public server", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server)
      await new Promise<void>((resolve, reject) =>
        server?.close(error => (error ? reject(error) : resolve()))
      );
    server = undefined;
  });

  it("exposes only bounded anonymous public signal data", async () => {
    const app = createPublicApp({
      listJurisdictions: async () => [],
      listSignals: async input => [
        {
          id: "signal-1",
          headline: "Public",
          summary: "Public",
          signal_type: "regulation",
          importance: "watch",
          canonical_url: "https://example.gov/item",
          published_at: "2026-08-24T00:00:00.000Z",
          jurisdiction: null,
          input,
        } as never,
      ],
    });
    const running = await startServer(app);
    server = running.server;

    const response = await fetch(
      `${running.origin}/api/public/signals?limit=999&offset=3`
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "signal-1" })])
    );
  });

  it("reports health and allows only explicitly configured browser origins", async () => {
    const environment = parsePublicServerEnv({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "p".repeat(32),
      CORS_ORIGINS: "https://brief.example",
    });
    const app = createPublicApp(
      { listJurisdictions: async () => [], listSignals: async () => [] },
      environment
    );
    const running = await startServer(app);
    server = running.server;

    const health = await fetch(`${running.origin}/healthz`, {
      headers: { Origin: "https://brief.example" },
    });
    expect(health.status).toBe(200);
    expect(health.headers.get("access-control-allow-origin")).toBe(
      "https://brief.example"
    );
    await expect(health.json()).resolves.toEqual({ status: "ok" });

    const deniedOrigin = await fetch(`${running.origin}/healthz`, {
      headers: { Origin: "https://untrusted.example" },
    });
    expect(deniedOrigin.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("registers the Express 5-compatible SPA fallback without crashing startup", async () => {
    const app = createPublicApp({
      listJurisdictions: async () => [],
      listSignals: async () => [],
    });
    expect(() =>
      attachProductionStaticRoutes(app, "/nonexistent-public-dir")
    ).not.toThrow();

    const running = await startServer(app);
    server = running.server;
    await expect(fetch(`${running.origin}/healthz`)).resolves.toHaveProperty(
      "status",
      200
    );
  });

  it("rejects malformed jurisdiction filters without querying the repository", async () => {
    let calls = 0;
    const app = createPublicApp({
      listJurisdictions: async () => [],
      listSignals: async () => {
        calls += 1;
        return [];
      },
    });
    const running = await startServer(app);
    server = running.server;

    const response = await fetch(
      `${running.origin}/api/public/signals?jurisdiction=EU%20AI`
    );
    expect(response.status).toBe(400);
    expect(calls).toBe(0);
    await expect(response.json()).resolves.toEqual({
      error: "invalid_jurisdiction",
    });
  });

  it("redacts upstream failures rather than returning provider detail", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const app = createPublicApp({
      listJurisdictions: async () => {
        throw new SupabaseDataError(401);
      },
      listSignals: async () => [],
    });
    const running = await startServer(app);
    server = running.server;

    const response = await fetch(`${running.origin}/api/public/jurisdictions`);
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: "public_data_unavailable",
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[brief-public-api] request failed",
      {
        kind: "SupabaseDataError",
        upstreamStatus: 401,
      }
    );
  });
});
