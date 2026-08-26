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

  it("reports health and allows only explicitly configured browser origins", async () => {
    const environment = parsePublicServerEnv({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "p".repeat(32),
      CORS_ORIGINS: "https://brief.example",
    });
    const app = createPublicApp({}, environment);
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

  it("exposes only the Workspace API after Discover removal", async () => {
    const app = createPublicApp({
      listWorkspace: async () => ({
        cycle: null,
        schedule: {
          label: "Sundays + Wednesdays + Fridays",
          timezone: "Asia/Kolkata",
          next_window: "2026-08-26T03:30:00.000Z",
        },
        changes: [],
        ideas: [],
        expansions: [],
      }),
    });
    const running = await startServer(app);
    server = running.server;

    const workspace = await fetch(`${running.origin}/api/public/workspace`);
    expect(workspace.status).toBe(200);
    await expect(workspace.json()).resolves.toMatchObject({
      changes: [],
      ideas: [],
      expansions: [],
    });

    await expect(
      fetch(`${running.origin}/api/public/signals`)
    ).resolves.toHaveProperty("status", 404);
    await expect(
      fetch(`${running.origin}/api/public/jurisdictions`)
    ).resolves.toHaveProperty("status", 404);
  });

  it("registers the Express 5-compatible SPA fallback without crashing startup", async () => {
    const app = createPublicApp();
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

  it("redacts upstream failures rather than returning provider detail", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const app = createPublicApp({
      listWorkspace: async () => {
        throw new SupabaseDataError(401);
      },
    });
    const running = await startServer(app);
    server = running.server;

    const response = await fetch(`${running.origin}/api/public/workspace`);
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
    consoleError.mockRestore();
  });
});
