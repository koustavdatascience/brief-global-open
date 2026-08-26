import { createHash } from "node:crypto";

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

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
