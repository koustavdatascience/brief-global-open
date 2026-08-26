import { postgrestIn } from "./shared/postgrest";
import type { WorkspaceTopic } from "../shared/workspaceTopics";
import { supabasePublicFetch } from "./supabaseData";

export type WorkspaceChangeType =
  "regulation" | "enforcement" | "market_access" | "guidance" | "other";

export type PublicWorkspaceChange = {
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
};

export type PublicWorkspaceIdea = {
  id: string;
  change_id: string;
  title: string;
  summary: string;
  rationale: string;
  confidence: number;
};

export type PublicWorkspaceExpansion = {
  idea_id: string;
  body_markdown: string;
  generated_at: string;
};

export type PublicWorkspace = {
  cycle: {
    id: string;
    scheduled_for: string;
    completed_at: string | null;
    change_count: number;
    idea_count: number;
    status: "completed";
  } | null;
  schedule: {
    label: string;
    timezone: string;
    next_window: string;
  };
  changes: PublicWorkspaceChange[];
  ideas: PublicWorkspaceIdea[];
  expansions: PublicWorkspaceExpansion[];
};

type PublicCycleRow = PublicWorkspace["cycle"];

const CHANGE_LIMIT = 24;

export async function listPublicWorkspace(): Promise<PublicWorkspace> {
  const cycleQuery = new URLSearchParams({
    select:
      "id,scheduled_for,completed_at:finished_at,change_count,idea_count,status",
    status: "eq.completed",
    order: "scheduled_for.desc",
    limit: "1",
  });
  const cycleResponse = await supabasePublicFetch(
    `/rest/v1/brief_cycles?${cycleQuery.toString()}`
  );
  const cycle = ((await cycleResponse.json()) as PublicCycleRow[])[0] ?? null;

  if (!cycle) {
    return {
      cycle: null,
      schedule: {
        label: "Sundays, Wednesdays, and Fridays at 09:00",
        timezone: "Asia/Kolkata",
        next_window: "The first scheduled cycle is being prepared.",
      },
      changes: [],
      ideas: [],
      expansions: [],
    };
  }

  const changeQuery = new URLSearchParams({
    select:
      "id,headline,summary,change_type,importance,canonical_url,published_at,source_name,topics,jurisdiction:jurisdictions(code,name,region,flag_emoji)",
    cycle_id: `eq.${cycle.id}`,
    is_public: "eq.true",
    order: "published_at.desc",
    limit: String(CHANGE_LIMIT),
  });
  const changeResponse = await supabasePublicFetch(
    `/rest/v1/brief_changes?${changeQuery.toString()}`
  );
  const changes = (await changeResponse.json()) as PublicWorkspaceChange[];
  const changeIds = changes.map(change => change.id);
  if (changeIds.length === 0) {
    return {
      cycle,
      schedule: {
        label: "Sundays, Wednesdays, and Fridays at 09:00",
        timezone: "Asia/Kolkata",
        next_window: "The next cycle will refresh this public workspace.",
      },
      changes,
      ideas: [],
      expansions: [],
    };
  }

  const ideaQuery = new URLSearchParams({
    select: "id,change_id,title,summary,rationale,confidence",
    change_id: postgrestIn(changeIds),
    is_public: "eq.true",
    order: "created_at.asc",
    limit: String(CHANGE_LIMIT),
  });
  const ideaResponse = await supabasePublicFetch(
    `/rest/v1/brief_ideas?${ideaQuery.toString()}`
  );
  const ideas = (await ideaResponse.json()) as PublicWorkspaceIdea[];
  const ideaIds = ideas.map(idea => idea.id);
  if (ideaIds.length === 0) {
    return {
      cycle,
      schedule: {
        label: "Sundays, Wednesdays, and Fridays at 09:00",
        timezone: "Asia/Kolkata",
        next_window: "The next cycle will refresh this public workspace.",
      },
      changes,
      ideas,
      expansions: [],
    };
  }

  const expansionQuery = new URLSearchParams({
    select: "idea_id,body_markdown,generated_at",
    idea_id: postgrestIn(ideaIds),
    is_public: "eq.true",
    order: "generated_at.desc",
    limit: String(CHANGE_LIMIT),
  });
  const expansionResponse = await supabasePublicFetch(
    `/rest/v1/brief_idea_expansions?${expansionQuery.toString()}`
  );
  const expansionRows =
    (await expansionResponse.json()) as PublicWorkspaceExpansion[];
  const latestExpansionByIdea = new Map<string, PublicWorkspaceExpansion>();
  for (const expansion of expansionRows) {
    if (!latestExpansionByIdea.has(expansion.idea_id))
      latestExpansionByIdea.set(expansion.idea_id, expansion);
  }
  const expansions = ideas
    .map(idea => latestExpansionByIdea.get(idea.id))
    .filter((expansion): expansion is PublicWorkspaceExpansion =>
      Boolean(expansion)
    );

  return {
    cycle,
    schedule: {
      label: "Sundays, Wednesdays, and Fridays at 09:00",
      timezone: "Asia/Kolkata",
      next_window: "The next cycle will refresh this public workspace.",
    },
    changes,
    ideas,
    expansions,
  };
}
