import type { WorkspaceTopic } from "../../../shared/workspaceTopics";

export type WorkspaceChangeType =
  "regulation" | "enforcement" | "market_access" | "guidance" | "other";

export type PublicWorkspace = {
  cycle: {
    id: string;
    scheduled_for: string;
    completed_at: string | null;
    change_count: number;
    idea_count: number;
    source_record_count: number;
    analysis_pending_count: number;
    analysis_failed_count: number;
    status: "completed" | "completed_with_warnings" | "source_only";
  } | null;
  schedule: {
    label: string;
    timezone: string;
    next_window: string;
  };
  changes: Array<{
    id: string;
    headline: string;
    summary: string;
    change_type: WorkspaceChangeType;
    importance: "watch" | "notable" | "material";
    canonical_url: string;
    published_at: string;
    source_name: string;
    topics: WorkspaceTopic[];
    jurisdiction: {
      code: string;
      name: string;
      region: string;
      flag_emoji: string | null;
    } | null;
  }>;
  ideas: Array<{
    id: string;
    change_id: string;
    title: string;
    summary: string;
    rationale: string;
    confidence: number;
  }>;
  expansions: Array<{
    idea_id: string;
    body_markdown: string;
    generated_at: string;
  }>;
  source_records: Array<{
    id: string;
    title: string;
    official_record_url: string;
    published_at: string;
    source_name: string;
    status: "analysis_pending" | "analysis_failed" | "analysis_rejected";
    status_reason: string;
    jurisdiction: {
      code: string;
      name: string;
      region: string;
      flag_emoji: string | null;
    } | null;
  }>;
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

export function getPublicWorkspace(signal?: AbortSignal) {
  return getJson<PublicWorkspace>(
    `/api/public/workspace?refresh=${Date.now()}`,
    signal
  );
}
