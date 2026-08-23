import { describe, expect, it } from "vitest";
import { parsePublicServerEnv } from "./publicEnv";

describe("portable public environment", () => {
  it("accepts only explicit server-safe Supabase configuration and normalized CORS origins", () => {
    const env = parsePublicServerEnv({
      SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_PUBLISHABLE_KEY: "p".repeat(32),
      CORS_ORIGINS: "https://brief.example, http://localhost:5173 ",
    });
    expect([...env.allowedCorsOrigins]).toEqual([
      "https://brief.example",
      "http://localhost:5173",
    ]);
  });

  it("rejects missing public database configuration and path-bearing CORS entries", () => {
    expect(() =>
      parsePublicServerEnv({
        SUPABASE_URL: "https://project.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "p".repeat(32),
        CORS_ORIGINS: "https://brief.example/path",
      })
    ).toThrow("CORS_ORIGINS");
    expect(() =>
      parsePublicServerEnv({ SUPABASE_URL: "https://project.supabase.co" })
    ).toThrow();
  });
});
