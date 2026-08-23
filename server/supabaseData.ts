const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export class SupabaseDataError extends Error {
  constructor(public readonly status: number) {
    super(`Supabase data request failed with status ${status}.`);
    this.name = "SupabaseDataError";
  }
}

export async function supabaseUserFetch(
  path: string,
  accessToken: string,
  init: RequestInit = {}
) {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase browser-safe configuration is unavailable.");
  }
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabasePublishableKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new SupabaseDataError(response.status);
  return response;
}

/**
 * Uses the publishable Supabase role only. Callers must target an anonymous-RLS
 * projection and must never use this helper for workspace-scoped tables.
 */
export async function supabasePublicFetch(
  path: string,
  init: RequestInit = {}
) {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase browser-safe configuration is unavailable.");
  }
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabasePublishableKey,
      // Current publishable keys are opaque values rather than JWTs. They
      // authenticate on `apikey` only; sending them as a Bearer token causes
      // Supabase to reject the request before anonymous RLS is evaluated.
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!response.ok) throw new SupabaseDataError(response.status);
  return response;
}
