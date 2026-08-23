export type PublicJurisdiction = {
  id: string;
  code: string;
  name: string;
  region: string;
  flag_emoji: string | null;
};

export type PublicSignal = {
  id: string;
  headline: string;
  summary: string;
  signal_type:
    | "regulation"
    | "consultation"
    | "enforcement"
    | "standard"
    | "market_access";
  importance: "watch" | "notable" | "material";
  canonical_url: string;
  published_at: string;
  jurisdiction: Pick<
    PublicJurisdiction,
    "code" | "name" | "region" | "flag_emoji"
  > | null;
};

export class PublicApiError extends Error {
  constructor(public readonly status: number) {
    super("The public Brief API request failed.");
    this.name = "PublicApiError";
  }
}

async function getJson<T>(path: string, signal?: AbortSignal) {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) throw new PublicApiError(response.status);
  return (await response.json()) as T;
}

export function listPublicSignals(signal?: AbortSignal) {
  return getJson<PublicSignal[]>(
    "/api/public/signals?limit=12&offset=0",
    signal
  );
}

export function listPublicJurisdictions(signal?: AbortSignal) {
  return getJson<PublicJurisdiction[]>(
    "/api/public/jurisdictions?limit=32",
    signal
  );
}
