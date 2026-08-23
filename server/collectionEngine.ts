import { createHash } from "node:crypto";

export type CandidateDisposition = "eligible" | "skipped";

export type CandidateResult = {
  canonicalUrl: string;
  fingerprint: string;
  disposition: CandidateDisposition;
  reason: string | null;
};

const SKIP_PATH_SEGMENTS = [
  "/login",
  "/signin",
  "/search",
  "/tag",
  "/tags",
  "/category",
  "/categories",
  "/archive",
  "/archives",
];
const GENERIC_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".json",
  ".xml",
  ".zip",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
]);

export function canonicalizeHttpsUrl(
  rawUrl: string,
  allowedHosts: readonly string[]
): string {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:") throw new Error("https_url_required");
  if (!allowedHosts.includes(parsed.hostname.toLowerCase()))
    throw new Error("host_not_approved");
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.pathname =
    parsed.pathname.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
  const retained: Array<[string, string]> = [];
  parsed.searchParams.forEach((value, key) => {
    if (!/^(utm_|fbclid$|gclid$)/i.test(key)) retained.push([key, value]);
  });
  retained.sort(([a], [b]) => a.localeCompare(b));
  parsed.search = retained.length
    ? `?${new URLSearchParams(retained).toString()}`
    : "";
  return parsed.toString();
}

export function classifyCandidate(canonicalUrl: string): CandidateResult {
  const parsed = new URL(canonicalUrl);
  const path = parsed.pathname.toLowerCase();
  const fingerprint = sha256(canonicalUrl);
  const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
  if (
    SKIP_PATH_SEGMENTS.some(
      segment => path === segment || path.startsWith(`${segment}/`)
    )
  ) {
    return {
      canonicalUrl,
      fingerprint,
      disposition: "skipped",
      reason: "generic_navigation_path",
    };
  }
  if (GENERIC_EXTENSIONS.has(extension)) {
    return {
      canonicalUrl,
      fingerprint,
      disposition: "skipped",
      reason: "non_document_extension",
    };
  }
  return { canonicalUrl, fingerprint, disposition: "eligible", reason: null };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function collectionExecutionKey(
  sourceIds: readonly string[],
  requestedAt: Date
): string {
  const normalizedSources = [...sourceIds].sort().join(",");
  return sha256(`${requestedAt.toISOString()}|${normalizedSources}`);
}

export function sourceRunExecutionKey(
  collectionRunKey: string,
  sourceId: string
): string {
  return sha256(`${collectionRunKey}|${sourceId}`);
}

export function shouldCreateDocumentVersion(
  previousContentHash: string | null,
  nextContent: string
): boolean {
  return previousContentHash !== sha256(nextContent);
}
