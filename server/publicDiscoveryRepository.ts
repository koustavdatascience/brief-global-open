import { supabasePublicFetch } from "./supabaseData";

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

function boundedLimit(limit?: number) {
  return Math.max(1, Math.min(limit ?? 12, 24));
}

function boundedOffset(offset?: number) {
  return Math.max(0, offset ?? 0);
}

export async function listPublicJurisdictions(limit?: number) {
  const query = new URLSearchParams({
    select: "id,code,name,region,flag_emoji",
    order: "name.asc",
    limit: String(Math.max(1, Math.min(limit ?? 32, 64))),
  });
  const response = await supabasePublicFetch(
    `/rest/v1/jurisdictions?${query.toString()}`
  );
  return (await response.json()) as PublicJurisdiction[];
}

export async function listPublicSignals(input: {
  jurisdictionCode?: string;
  limit?: number;
  offset?: number;
}) {
  const query = new URLSearchParams({
    select:
      "id,headline,summary,signal_type,importance,canonical_url,published_at,jurisdiction:jurisdictions!inner(code,name,region,flag_emoji)",
    order: "published_at.desc",
    limit: String(boundedLimit(input.limit)),
    offset: String(boundedOffset(input.offset)),
  });
  if (input.jurisdictionCode)
    query.set("jurisdictions.code", `eq.${input.jurisdictionCode}`);
  const response = await supabasePublicFetch(
    `/rest/v1/public_signals?${query.toString()}`
  );
  return (await response.json()) as PublicSignal[];
}
