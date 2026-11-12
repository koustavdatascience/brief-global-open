import {
  MAX_GLOBAL_CANDIDATE_SOURCE_BYTES,
  type BoundedGlobalDocument,
} from "./globalCandidateExecutor";

export type FederalRegisterApprovedSource = {
  id: string;
  canonicalUrl: string;
  sourceKind: "api";
  jurisdictionCode: "USA";
  sourceLanguage: string;
};

type FederalRegisterRecord = {
  title?: string;
  html_url?: string;
  raw_text_url?: string;
  document_number?: string;
  publication_date?: string;
};

type FederalRegisterResponse = { results?: FederalRegisterRecord[] };

type FederalRegisterDetail = Pick<FederalRegisterRecord, "raw_text_url">;
const FEDERAL_REGISTER_LOOKBACK_DAYS = 4;
const FEDERAL_REGISTER_MAX_RECORDS = 25;
const FEDERAL_REGISTER_USER_AGENT =
  "Brief policy workspace/1.0 (source ingestion; contact: koustavdatascience@gmail.com)";

function federalRegisterHeaders(accept: string) {
  return {
    Accept: accept,
    "User-Agent": FEDERAL_REGISTER_USER_AGENT,
  };
}

function approvedUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "www.federalregister.gov"
  )
    throw new Error("unapproved_federal_register_url");
  return url.toString();
}

function publicationTimestamp(date?: string): string | null {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? `${date}T00:00:00.000Z`
    : null;
}

async function fetchBoundedText(
  url: string,
  fetcher: typeof fetch
): Promise<string> {
  const response = await fetcher(url, {
    headers: federalRegisterHeaders("text/plain, text/html;q=0.8"),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("federal_register_document_unavailable");
  approvedUrl(response.url || url);
  const advertisedLength = Number(
    response.headers.get("content-length") ?? "0"
  );
  if (
    Number.isFinite(advertisedLength) &&
    advertisedLength > MAX_GLOBAL_CANDIDATE_SOURCE_BYTES
  )
    throw new Error("source_too_large");
  const text = await response.text();
  if (/Federal Register :: Request Access/i.test(text))
    throw new Error("federal_register_access_page");
  if (
    new TextEncoder().encode(text).byteLength >
    MAX_GLOBAL_CANDIDATE_SOURCE_BYTES
  )
    throw new Error("source_too_large");
  return text;
}

async function resolveRawTextUrl(
  record: FederalRegisterRecord,
  fetcher: typeof fetch
): Promise<string | null> {
  if (record.raw_text_url) return approvedUrl(record.raw_text_url);
  if (!record.document_number) return null;

  const detailUrl = new URL(
    `https://www.federalregister.gov/api/v1/documents/${encodeURIComponent(record.document_number)}.json`
  );
  const response = await fetcher(detailUrl, {
    headers: federalRegisterHeaders("application/json"),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  approvedUrl(response.url || detailUrl.toString());
  const detail = (await response.json()) as FederalRegisterDetail;
  return detail.raw_text_url ? approvedUrl(detail.raw_text_url) : null;
}

function isoDateDaysAgo(now: Date, days: number) {
  const date = new Date(now);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** Fetches a bounded recent Federal Register window. No links are expanded. */
export async function fetchFederalRegisterDocuments(
  source: FederalRegisterApprovedSource,
  fetcher: typeof fetch = fetch,
  now: Date = new Date()
): Promise<BoundedGlobalDocument[]> {
  if (
    source.canonicalUrl !==
      "https://www.federalregister.gov/api/v1/documents.json" ||
    source.sourceKind !== "api" ||
    source.jurisdictionCode !== "USA"
  ) {
    throw new Error("unapproved_federal_register_source");
  }
  const endpoint = new URL(source.canonicalUrl);
  endpoint.searchParams.set("per_page", String(FEDERAL_REGISTER_MAX_RECORDS));
  endpoint.searchParams.set("order", "newest");
  endpoint.searchParams.set(
    "conditions[publication_date][gte]",
    isoDateDaysAgo(now, FEDERAL_REGISTER_LOOKBACK_DAYS)
  );
  endpoint.searchParams.append("conditions[type][]", "RULE");
  endpoint.searchParams.append("conditions[type][]", "PRORULE");
  const response = await fetcher(endpoint, {
    headers: federalRegisterHeaders("application/json"),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("federal_register_catalogue_unavailable");
  approvedUrl(response.url || endpoint.toString());
  const payload = (await response.json()) as FederalRegisterResponse;
  const records = Array.isArray(payload.results)
    ? payload.results.slice(0, FEDERAL_REGISTER_MAX_RECORDS)
    : [];
  const documents: BoundedGlobalDocument[] = [];
  for (const record of records) {
    try {
      if (!record.title || !record.html_url) continue;
      const officialRecordUrl = approvedUrl(record.html_url);
      const sourceDocumentUrl = await resolveRawTextUrl(record, fetcher);
      if (!sourceDocumentUrl) continue;
      const sourceText = await fetchBoundedText(sourceDocumentUrl, fetcher);
      documents.push({
        sourceDocumentUrl,
        officialRecordUrl,
        title: record.title,
        publishedAt: publicationTimestamp(record.publication_date),
        sourceText,
      });
    } catch {
      // A single record can lack a raw-text rendition or exceed the bounded
      // source contract; retain the rest of the approved catalogue window.
    }
  }
  return documents;
}
