import { z } from "zod";

const publicServerEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).optional(),
  PORT: z.string().regex(/^\d+$/).optional(),
  PUBLIC_API_PORT: z.string().regex(/^\d+$/).optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  CORS_ORIGINS: z.string().optional(),
});

export type PublicServerEnv = z.infer<typeof publicServerEnvSchema> & {
  allowedCorsOrigins: ReadonlySet<string>;
};

export function parsePublicServerEnv(
  input: NodeJS.ProcessEnv = process.env
): PublicServerEnv {
  const parsed = publicServerEnvSchema.parse({
    ...input,
    SUPABASE_URL: input.SUPABASE_URL ?? input.VITE_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY:
      input.SUPABASE_PUBLISHABLE_KEY ?? input.VITE_SUPABASE_PUBLISHABLE_KEY,
  });
  const allowedCorsOrigins = new Set(
    (parsed.CORS_ORIGINS ?? "")
      .split(",")
      .map(origin => origin.trim())
      .filter(Boolean)
  );
  for (const origin of Array.from(allowedCorsOrigins)) {
    if (
      !/^https:\/\/[^/]+$/.test(origin) &&
      !/^http:\/\/localhost(?::\d+)?$/.test(origin)
    ) {
      throw new Error(
        "CORS_ORIGINS must contain comma-separated HTTP(S) origins without paths."
      );
    }
  }
  return { ...parsed, allowedCorsOrigins };
}
