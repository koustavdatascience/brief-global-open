import express, { type Express, type Request, type Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listPublicJurisdictions,
  listPublicSignals,
} from "./publicDiscoveryRepository";
import { listPublicWorkspace } from "./publicWorkspaceRepository";
import { parsePublicServerEnv, type PublicServerEnv } from "./publicEnv";
import { SupabaseDataError } from "./supabaseData";

type PublicDataDependencies = {
  listJurisdictions: typeof listPublicJurisdictions;
  listSignals: typeof listPublicSignals;
  listWorkspace?: typeof listPublicWorkspace;
};

const defaultDependencies: PublicDataDependencies = {
  listJurisdictions: listPublicJurisdictions,
  listSignals: listPublicSignals,
  listWorkspace: listPublicWorkspace,
};

function numericQuery(value: unknown, fallback: number, maximum: number) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  return Math.min(Math.max(Number(value), 0), maximum);
}

function jurisdictionQuery(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  if (!/^[A-Z]{2,8}$/.test(value)) return null;
  return value;
}

function applyPublicHeaders(response: Response) {
  response.set({
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Content-Security-Policy":
      "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
}

function allowConfiguredCors(
  request: Request,
  response: Response,
  environment?: PublicServerEnv
) {
  const origin = request.get("origin");
  if (!origin || !environment?.allowedCorsOrigins.has(origin)) return;
  response.set("Access-Control-Allow-Origin", origin);
  response.set("Vary", "Origin");
}

export function createPublicApp(
  dependencies: PublicDataDependencies = defaultDependencies,
  environment?: PublicServerEnv
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use((request, response, next) => {
    applyPublicHeaders(response);
    allowConfiguredCors(request, response, environment);
    next();
  });

  app.get("/healthz", (_, response) =>
    response.status(200).json({ status: "ok" })
  );

  app.get(
    "/api/public/jurisdictions",
    async (request: Request, response: Response, next) => {
      try {
        const jurisdictions = await dependencies.listJurisdictions(
          numericQuery(request.query.limit, 32, 64) || 32
        );
        response.json(jurisdictions);
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/public/workspace",
    async (_request: Request, response: Response, next) => {
      try {
        response.json(
          await (dependencies.listWorkspace ?? listPublicWorkspace)()
        );
      } catch (error) {
        next(error);
      }
    }
  );

  app.get(
    "/api/public/signals",
    async (request: Request, response: Response, next) => {
      const jurisdictionCode = jurisdictionQuery(request.query.jurisdiction);
      if (jurisdictionCode === null) {
        response.status(400).json({ error: "invalid_jurisdiction" });
        return;
      }
      try {
        const signals = await dependencies.listSignals({
          jurisdictionCode,
          limit: numericQuery(request.query.limit, 12, 24) || 12,
          offset: numericQuery(request.query.offset, 0, 10_000),
        });
        response.json(signals);
      } catch (error) {
        next(error);
      }
    }
  );

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response,
      _next: () => void
    ) => {
      console.error("[brief-public-api] request failed", {
        kind: error instanceof Error ? error.name : "unknown_error",
        // The status is enough to distinguish configuration, policy, and
        // availability failures in private host logs without exposing an
        // upstream response body, URL, or credential to public clients.
        upstreamStatus:
          error instanceof SupabaseDataError ? error.status : undefined,
      });
      response.status(502).json({ error: "public_data_unavailable" });
    }
  );
  return app;
}

export function attachProductionStaticRoutes(
  app: Express,
  staticDirectory: string
) {
  app.use(express.static(staticDirectory, { index: false, maxAge: "1h" }));
  // Express 5 uses path-to-regexp v8, where the old bare `*` route pattern
  // is invalid and crashes at process startup. The named wildcard syntax also
  // includes the root path, preserving SPA fallback behavior.
  app.get("/{*path}", (_request, response) =>
    response.sendFile(path.join(staticDirectory, "index.html"))
  );
}

async function start() {
  const environment = parsePublicServerEnv();
  const app = createPublicApp(defaultDependencies, environment);
  const isProduction = environment.NODE_ENV === "production";
  if (isProduction) {
    const currentFile = fileURLToPath(import.meta.url);
    const staticDirectory = path.resolve(path.dirname(currentFile), "public");
    attachProductionStaticRoutes(app, staticDirectory);
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      appType: "spa",
      // Local/sandbox development uses a temporary proxied hostname. This does
      // not apply to the production static-server path above.
      server: { middlewareMode: true, allowedHosts: true },
    });
    app.use(vite.middlewares);
  }
  const configuredPort = Number(
    environment.PORT ?? environment.PUBLIC_API_PORT ?? "3000"
  );
  const port =
    Number.isFinite(configuredPort) && configuredPort > 0
      ? configuredPort
      : 3000;
  app.listen(port, "0.0.0.0", () =>
    console.log(`[brief] public API listening on ${port}`)
  );
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
) {
  void start();
}
