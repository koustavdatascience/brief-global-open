import { useEffect, useMemo, useState } from "react";
import BrandMark from "@/components/BrandMark";
import BlurredStagger from "@/components/BlurredStagger";
import { jsPDF } from "jspdf";
import EditorialLabel from "@/components/EditorialLabel";
import {
  ArrowUpRight,
  Download,
  ChevronDown,
  ExternalLink,
  Github,
  LoaderCircle,
  Sparkles,
  Tags,
  X,
} from "lucide-react";
import { Link } from "wouter";
import {
  getPublicWorkspace,
  type PublicWorkspace,
  type WorkspaceChangeType,
} from "@/lib/publicApi";
import {
  WORKSPACE_TOPIC_LABELS,
  WORKSPACE_TOPIC_VALUES,
  type WorkspaceTopic,
} from "../../../shared/workspaceTopics";

const typeLabels: Record<WorkspaceChangeType, string> = {
  regulation: "Regulation",
  enforcement: "Legislation and enforcement",
  market_access: "Market access",
  guidance: "Guidance and standards",
  other: "Other policy movement",
};

const typeOrder: WorkspaceChangeType[] = [
  "regulation",
  "enforcement",
  "market_access",
  "guidance",
  "other",
];

function formatDate(value: string | null | undefined) {
  if (!value) return "Not yet run";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function cleanPrdLine(value: string) {
  return value
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
    .replace(/\*+/g, "")
    .replace(/_+/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/•/g, "-")
    .trim();
}

const spacedLabelReplacements = [
  "What changed",
  "Who is affected",
  "Why it matters",
  "Effective date",
  "Concrete action",
  "Policy topic",
  "Publication",
  "Official source",
];

function spacedLabelPattern(label: string) {
  return label
    .split("")
    .map(character => (character === " " ? "\\s+" : `${character}\\s*`))
    .join("");
}

function normalizeSpacedLabels(value: string) {
  return spacedLabelReplacements.reduce(
    (current, label) =>
      current.replace(
        new RegExp(`(?<![A-Za-z])${spacedLabelPattern(label)}(?=\\s*:)`, "gi"),
        label
      ),
    value
  );
}

function normalizeCharacterSpacedRuns(value: string) {
  const withoutUppercaseSpacing = value.replace(
    /(?<![A-Za-z])(?:[A-Z](?:[\s\u00a0\u2007\u202f]+)){2,}[A-Z](?![A-Za-z])/g,
    run => run.replace(/[\s\u00a0\u2007\u202f]+/g, "")
  );
  return withoutUppercaseSpacing.replace(
    /(?<![0-9])(?:[0-9](?:[\s\u00a0\u2007\u202f]+)){1,}[0-9](?![0-9])/g,
    run => run.replace(/[\s\u00a0\u2007\u202f]+/g, "")
  );
}

function hasCharacterSpacingArtifact(value: string) {
  return value.split(/\r?\n/).some(line => {
    const tokens = line.trim().split(/\s+/).filter(Boolean);
    const singleCharacterTokens = tokens.filter(token =>
      /^[A-Za-z0-9]$/.test(token)
    ).length;
    return (
      singleCharacterTokens >= 4 &&
      singleCharacterTokens / Math.max(tokens.length, 1) >= 0.3
    );
  });
}

export function hasCompactMarkdownArtifact(value: string) {
  const compactHeading = /#{1,3}\s+[^\n#]{12,}\s{2,}#{1,3}\s+/i.test(value);
  const headingWithInlineLabel =
    /#{1,3}\s+(?:plain-language context|what changed|practical mvp|users and workflow|data and implementation|economic logic|risks and constraints|first next steps)\s+(?:\d+\.\s+)?\*{1,2}[^*\n]+\*{1,2}\s*(?:[:–-])/i.test(
      value
    );
  const repeatedInlineLabels =
    /\*{1,2}[^*\n]{2,}\*{1,2}\s*(?:[:–-])\s*[^\n]{2,}\*{1,2}[^*\n]{2,}\*{1,2}\s*(?:[:–-])/i.test(
      value
    );
  return compactHeading || headingWithInlineLabel || repeatedInlineLabels;
}

function renderPrd(markdown: string) {
  const normalized = markdown
    .replace(/\s+(#{1,3}\s+)/g, "\n$1")
    .replace(/\s+((?:[-*]|\d+\.)\s+)/g, "\n$1");
  return normalized.split(/\r?\n/).map((line, index) => {
    const value = line.trim();
    if (!value) return <div className="h-2" key={`space-${index}`} />;
    const heading = value.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      return (
        <h3
          className="pt-4 text-sm font-semibold tracking-[-0.01em] text-white first:pt-0"
          key={`heading-${index}`}
        >
          {cleanPrdLine(heading[1])}
        </h3>
      );
    }
    const bullet = value.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (bullet) {
      return (
        <div
          className="flex gap-3 text-sm leading-7 text-white/70"
          key={`bullet-${index}`}
        >
          <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full bg-[#aeb9ff]" />
          <span>{cleanPrdLine(bullet[1])}</span>
        </div>
      );
    }
    return (
      <p className="text-sm leading-7 text-white/70" key={`paragraph-${index}`}>
        {cleanPrdLine(value)}
      </p>
    );
  });
}

function fallbackPrd(
  change: PublicWorkspace["changes"][number],
  idea: PublicWorkspace["ideas"][number]
) {
  return [
    "## Plain-language context",
    `This policy update was published by ${change.source_name}. In practical terms, the official notice says: ${change.summary}`,
    "",
    "## What changed",
    change.headline,
    "",
    "## Why it matters",
    "The official record is the authority. This brief is an orientation that helps teams understand what deserves attention and what can wait; it is not legal or investment advice.",
    "",
    "## Product concept",
    idea.summary,
    "",
    "## Target users",
    "- Policy, compliance, product, operations, and finance teams monitoring regulatory change.",
    "- Analysts and developers who need a source-linked starting point for further research.",
    "",
    "## Core user workflow",
    "- Capture the official notice and preserve its source link.",
    "- Explain the change in plain language and identify the affected workflow.",
    "- Track follow-up tasks, owners, dates, and evidence.",
    "- Review operational and economic implications before deciding whether to build.",
    "",
    "## MVP scope",
    "- Source-linked notice record with a plain-language explanation.",
    "- Structured change summary, review checklist, and evidence trail.",
    "- Exportable brief for internal discussion and qualified review.",
    "",
    "## Data and implementation",
    "Use the official notice as the primary record, store the interpretation separately, keep claims traceable to the source URL, and include human review before any compliance or financial action.",
    "",
    "## Economic logic",
    `${idea.rationale} Validate the opportunity with a small pilot and measure time saved, review quality, and willingness to pay before expanding scope.`,
    "",
    "## Risks and constraints",
    "The source may be amended, the interpretation may omit legal nuance, and users may treat a product brief as advice. Keep the official record visible and require qualified review for consequential decisions.",
    "",
    "## First 30 days",
    "- Interview potential users about the current monitoring workflow.",
    "- Prototype the source record, explanation, and review checklist.",
    "- Test against the official notice and record unanswered questions.",
    "- Define a small pilot and success measures before building integrations.",
    "",
    "## Official source",
    change.canonical_url,
  ].join("\n");
}

type PdfLine = { kind: "heading" | "body" | "bullet"; text: string };

const pdfHeadingAliases: Record<string, string> = {
  "plain-language context": "Plain-language context",
  "what changed": "What changed",
  "why it matters": "Why it matters",
  "product concept": "Product concept",
  "the opportunity": "The opportunity",
  "target users": "Target users",
  "users and workflow": "Users and workflow",
  "core user workflow": "Core user workflow",
  "mvp scope": "MVP scope",
  "practical mvp": "Practical MVP",
  "data and implementation": "Data and implementation",
  "economic logic": "Economic logic",
  "risks and constraints": "Risks and constraints",
  "first 30 days": "First 30 days",
  "first next steps": "First next steps",
  "official source": "Official source",
  sources: "Sources",
};

function headingAlias(value: string) {
  return pdfHeadingAliases[cleanPrdLine(value).toLowerCase()];
}

function normalizeCompactPdfMarkdown(markdown: string) {
  const headingNames = Object.keys(pdfHeadingAliases)
    .sort((left, right) => right.length - left.length)
    .map(name => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return markdown
    .replace(/\s+(#{1,3}\s+)/g, "\n$1")
    .replace(
      new RegExp(
        `(#{1,3}\\s*)(${headingNames})(?=\\s{2,}|\\s+(?:\\d+\\.|[-*])|\\s+\\*|\\s*$)`,
        "gi"
      ),
      "$1$2\n"
    )
    .replace(/\s+((?:[-*]|\d+\.)\s+)/g, "\n$1")
    .replace(/\s+•\s+/g, "\n- ")
    .replace(
      /(^|\n)\s*(?:(?:[-*]|\d+\.)\s+)?\*{1,2}([^*\n]+)\*{1,2}\s*(?:[:–-])\s*/g,
      "$1- $2: "
    )
    .replace(/\s+\*{1,2}([^*\n]+)\*{1,2}\s*(?:[:–-])\s*/g, "\n- $1: ");
}

export function normalizePdfText(value: string) {
  const normalizedSpaces = cleanPrdLine(value)
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/‑/g, "-")
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/\s{2,}/g, " ")
    .trim();
  return normalizeCharacterSpacedRuns(
    normalizeSpacedLabels(normalizedSpaces)
  ).trim();
}

export function pdfLines(markdown: string): PdfLine[] {
  const normalized = normalizeCompactPdfMarkdown(markdown);
  let inOfficialSource = false;
  const lines: PdfLine[] = [];
  for (const rawLine of normalized.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line === "---") continue;
    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      const knownHeading = headingAlias(heading[1]);
      if (knownHeading) {
        inOfficialSource = ["official source", "sources"].includes(
          knownHeading.toLowerCase()
        );
        if (inOfficialSource) continue;
        lines.push({ kind: "heading", text: knownHeading });
        continue;
      }
      const bodyFromUnknownHeading = heading[1].trim();
      if (bodyFromUnknownHeading) {
        lines.push({ kind: "body", text: bodyFromUnknownHeading });
      }
      continue;
    }
    if (inOfficialSource) continue;
    const bullet = line.match(/^(?:[-*]|\d+\.)\s+(.+)$/);
    if (bullet) lines.push({ kind: "bullet", text: bullet[1] });
    else lines.push({ kind: "body", text: line });
  }
  return lines;
}

function downloadPdf(
  idea: PublicWorkspace["ideas"][number],
  change: PublicWorkspace["changes"][number],
  expansion: PublicWorkspace["expansions"][number] | undefined
) {
  if (typeof window === "undefined") return;

  const document = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = document.internal.pageSize.getWidth();
  const pageHeight = document.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  const textSafetyGutter = 5;
  const contentBottom = pageHeight - 18;
  let y = margin;

  const addPageIfNeeded = (height: number) => {
    if (y + height <= contentBottom) return;
    document.addPage();
    y = margin;
  };

  const wrapToWidth = (text: string, width: number) => {
    const measuredLines = document.splitTextToSize(text, width) as string[];
    const lines: string[] = [];
    for (const measuredLine of measuredLines) {
      if (document.getTextWidth(measuredLine) <= width + 0.01) {
        lines.push(measuredLine);
        continue;
      }
      let current = "";
      for (const character of measuredLine) {
        const candidate = current + character;
        if (current && document.getTextWidth(candidate) > width) {
          lines.push(current);
          current = character;
        } else {
          current = candidate;
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  };

  const writeWrapped = (
    text: string,
    options: {
      size: number;
      lineHeight: number;
      color: [number, number, number];
      font?: "normal" | "bold";
      indent?: number;
      after?: number;
      before?: number;
    }
  ) => {
    const indent = options.indent ?? 0;
    document.setFont("helvetica", options.font ?? "normal");
    document.setFontSize(options.size);
    document.setCharSpace(0);
    document.setTextColor(...options.color);
    const lines = wrapToWidth(
      normalizePdfText(text),
      contentWidth - indent - textSafetyGutter
    );
    const lineHeight = options.lineHeight;
    const before = options.before ?? 0;
    addPageIfNeeded(before + lineHeight + lines.length * lineHeight);
    y += before;
    for (const line of lines) {
      addPageIfNeeded(lineHeight);
      document.setCharSpace(0);
      document.text(line, margin + indent, y);
      y += lineHeight;
    }
    y += options.after ?? 0;
  };

  document.setProperties({
    title: `${idea.title} - Brief PRD`,
    subject: "Source-grounded policy intelligence product brief",
    author: "Brief",
    creator: "Brief Global Open",
  });
  document.setFillColor(10, 12, 17);
  document.rect(0, 0, pageWidth, 9, "F");
  document.setFont("helvetica", "bold");
  document.setFontSize(8);
  document.setCharSpace(0);
  document.setTextColor(119, 131, 214);
  document.text("BRIEF / POLICY INTELLIGENCE", margin, 6);

  writeWrapped(idea.title, {
    size: 22,
    lineHeight: 9,
    color: [22, 25, 33],
    font: "bold",
    after: 3,
  });
  writeWrapped("Professional source-grounded product requirements brief", {
    size: 10,
    lineHeight: 5,
    color: [92, 99, 112],
    after: 7,
  });

  document.setDrawColor(220, 223, 229);
  document.line(margin, y, pageWidth - margin, y);
  y += 8;

  writeWrapped("Policy change", {
    size: 11,
    lineHeight: 5,
    color: [38, 47, 79],
    font: "bold",
    after: 2,
  });
  writeWrapped(change.headline, {
    size: 10,
    lineHeight: 5,
    color: [35, 39, 48],
    font: "bold",
    after: 2,
  });
  writeWrapped(change.summary, {
    size: 9.5,
    lineHeight: 4.8,
    color: [75, 81, 94],
    after: 2,
  });
  writeWrapped(
    `${change.jurisdiction?.name ?? "Global"} | ${change.source_name} | ${change.importance}`,
    {
      size: 8.5,
      lineHeight: 4.5,
      color: [111, 117, 129],
      after: 7,
    }
  );

  writeWrapped("Potential project or idea", {
    size: 11,
    lineHeight: 5,
    color: [38, 47, 79],
    font: "bold",
    after: 2,
  });
  writeWrapped(idea.summary, {
    size: 9.5,
    lineHeight: 4.8,
    color: [75, 81, 94],
    after: 2,
  });
  writeWrapped(idea.rationale, {
    size: 9.5,
    lineHeight: 4.8,
    color: [75, 81, 94],
    after: 7,
  });

  const expansionMarkdown =
    expansion &&
    !hasCharacterSpacingArtifact(expansion.body_markdown) &&
    !hasCompactMarkdownArtifact(expansion.body_markdown)
      ? expansion.body_markdown
      : fallbackPrd(change, idea);
  for (const line of pdfLines(expansionMarkdown)) {
    if (line.kind === "heading") {
      writeWrapped(line.text, {
        size: 11,
        lineHeight: 5,
        color: [38, 47, 79],
        font: "bold",
        before: 3,
        after: 2,
      });
    } else if (line.kind === "bullet") {
      writeWrapped(`- ${line.text}`, {
        size: 9.5,
        lineHeight: 4.8,
        color: [75, 81, 94],
        indent: 3,
        after: 1.5,
      });
    } else {
      writeWrapped(line.text, {
        size: 9.5,
        lineHeight: 4.8,
        color: [75, 81, 94],
        after: 2,
      });
    }
  }

  y += 4;
  writeWrapped("Official source", {
    size: 11,
    lineHeight: 5,
    color: [38, 47, 79],
    font: "bold",
    after: 2,
  });
  const sourceLabel = normalizePdfText(change.canonical_url);
  document.setFont("helvetica", "normal");
  document.setFontSize(8.5);
  document.setCharSpace(0);
  document.setTextColor(49, 82, 154);
  const sourceLines = wrapToWidth(sourceLabel, contentWidth - textSafetyGutter);
  for (const line of sourceLines) {
    addPageIfNeeded(4.5);
    document.setCharSpace(0);
    document.textWithLink(line, margin, y, { url: change.canonical_url });
    y += 4.5;
  }
  y += 4;

  for (let page = 1; page <= document.getNumberOfPages(); page += 1) {
    document.setPage(page);
    document.setDrawColor(220, 223, 229);
    document.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    document.setFont("helvetica", "normal");
    document.setFontSize(8);
    document.setCharSpace(0);
    document.setTextColor(130, 135, 145);
    document.text("Brief Global Open", margin, pageHeight - 8);
    document.text(`Page ${page}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  const slug = idea.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  document.save(`brief-${slug || "prd"}.pdf`);
}

export default function Workspace() {
  const [workspace, setWorkspace] = useState<PublicWorkspace | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [selectedType, setSelectedType] = useState<WorkspaceChangeType | "all">(
    "all"
  );
  const [selectedTopic, setSelectedTopic] = useState<WorkspaceTopic | "all">(
    "all"
  );
  const [topicMenuOpen, setTopicMenuOpen] = useState(false);
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void getPublicWorkspace(controller.signal)
      .then(nextWorkspace => {
        setWorkspace(nextWorkspace);
        setStatus("ready");
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStatus("error");
      });
    return () => controller.abort();
  }, []);

  const visibleChanges = useMemo(
    () =>
      workspace?.changes.filter(
        change =>
          (selectedType === "all" || change.change_type === selectedType) &&
          (selectedTopic === "all" || change.topics.includes(selectedTopic))
      ) ?? [],
    [selectedTopic, selectedType, workspace]
  );

  const ideasByChange = useMemo(() => {
    const map = new Map<string, PublicWorkspace["ideas"]>();
    for (const idea of workspace?.ideas ?? []) {
      const current = map.get(idea.change_id) ?? [];
      current.push(idea);
      map.set(idea.change_id, current);
    }
    return map;
  }, [workspace]);

  const expansionByIdea = useMemo(
    () =>
      new Map((workspace?.expansions ?? []).map(item => [item.idea_id, item])),
    [workspace]
  );

  const selectedIdea = workspace?.ideas.find(
    idea => idea.id === selectedIdeaId
  );
  const selectedChange = selectedIdea
    ? workspace?.changes.find(change => change.id === selectedIdea.change_id)
    : undefined;
  const selectedExpansion = selectedIdea
    ? expansionByIdea.get(selectedIdea.id)
    : undefined;
  const selectedPrd =
    selectedIdea && selectedChange
      ? (selectedExpansion?.body_markdown ??
        fallbackPrd(selectedChange, selectedIdea))
      : "";

  useEffect(() => {
    if (!selectedIdeaId) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedIdeaId(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedIdeaId]);

  const retry = () => {
    window.location.reload();
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07080b] text-white">
      <header className="mx-auto flex w-full items-center justify-between gap-4 px-6 py-5 sm:px-10 lg:px-16 xl:px-20">
        <Link href="/" aria-label="Brief home">
          <BrandMark compact tone="light" />
        </Link>
        <nav className="flex items-center gap-2 text-xs font-semibold text-white/55 sm:gap-5">
          <Link className="transition hover:text-white" href="/docs">
            Docs
          </Link>
          <a
            className="transition hover:text-white"
            href="https://github.com/koustavdatascience/brief-global-open"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
          <Link
            className="rounded-full border border-white/15 px-3 py-2 text-white transition hover:border-white/35 hover:bg-white/5"
            href="/"
          >
            About Brief
          </Link>
        </nav>
      </header>

      <section className="mx-auto w-full px-6 pb-16 pt-16 sm:px-10 lg:px-16 lg:pt-24 xl:px-20">
        <div className="grid gap-10 border-b border-white/10 pb-14 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-end lg:gap-16">
          <div>
            <EditorialLabel>Brief workspace</EditorialLabel>
            <h1 className="mt-5 max-w-5xl text-5xl font-medium leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-[5rem]">
              <BlurredStagger as="span" delay={80} stagger={18}>
                {"Policy changes, organized into what you can do next."}
              </BlurredStagger>
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/55">
              <BlurredStagger as="span" delay={520} stagger={12}>
                {
                  "Every Sunday, Wednesday, and Friday, Brief refreshes this public workspace with source-linked changes, grouped by policy type and subject area, and grounded project ideas for people watching policy, software, and markets together."
                }
              </BlurredStagger>
            </p>
          </div>
          <aside className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.15em] text-white/40">
                Next cycle
              </span>
              <Tags className="h-4 w-4 text-[#aeb9ff]" />
            </div>
            <p className="mt-6 text-xl font-medium tracking-[-0.04em] text-white">
              Sundays + Wednesdays + Fridays
            </p>
            <p className="mt-1 text-sm text-white/50">
              09:00 IST · Asia/Kolkata
            </p>
            <div className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
              {workspace?.schedule.next_window ??
                "The next cycle will refresh this public workspace."}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full px-6 pb-24 sm:px-10 lg:px-16 xl:px-20">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-white/10 pb-5">
          <div>
            <EditorialLabel>Latest cycle</EditorialLabel>
            <p className="mt-2 text-sm text-white/50">
              {workspace?.cycle
                ? `${formatDate(workspace.cycle.completed_at ?? workspace.cycle.scheduled_for)} · ${workspace.cycle.change_count} changes · ${workspace.cycle.idea_count} ideas`
                : "No completed cycle has been published yet."}
            </p>
          </div>
          <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-white/[0.025] p-2 shadow-[0_16px_50px_rgba(0,0,0,0.18)] sm:p-3 lg:w-auto">
            <div className="flex min-w-0 items-center gap-1">
              <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-max gap-1.5 pr-2">
                  <button
                    aria-pressed={selectedType === "all"}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${selectedType === "all" ? "bg-white text-[#07080b] shadow-sm" : "text-white/50 hover:bg-white/[0.06] hover:text-white"}`}
                    onClick={() => setSelectedType("all")}
                    type="button"
                  >
                    All changes
                  </button>
                  {typeOrder.map(type => (
                    <button
                      aria-pressed={selectedType === type}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${selectedType === type ? "bg-[#aeb9ff] text-[#07080b] shadow-sm" : "text-white/50 hover:bg-white/[0.06] hover:text-white"}`}
                      key={type}
                      onClick={() => setSelectedType(type)}
                      type="button"
                    >
                      {typeLabels[type]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative shrink-0 border-l border-white/[0.08] pl-1">
                <button
                  aria-expanded={topicMenuOpen}
                  aria-haspopup="menu"
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${selectedTopic !== "all" ? "bg-[#aeb9ff] text-[#07080b] shadow-sm" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}
                  onClick={() => setTopicMenuOpen(open => !open)}
                  type="button"
                >
                  <Tags className="h-3.5 w-3.5" />
                  <span className="max-w-[9rem] truncate">
                    {selectedTopic === "all"
                      ? "Topics"
                      : WORKSPACE_TOPIC_LABELS[selectedTopic]}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${topicMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {topicMenuOpen ? (
                  <div
                    aria-label="Topic filters"
                    className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-64 rounded-2xl border border-white/15 bg-[#0c0e13] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
                    role="menu"
                  >
                    <div className="px-3 pb-2 pt-1 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/35">
                      Filter by topic
                    </div>
                    <button
                      aria-checked={selectedTopic === "all"}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${selectedTopic === "all" ? "bg-white text-[#07080b]" : "text-white/60 hover:bg-white/[0.07] hover:text-white"}`}
                      onClick={() => {
                        setSelectedTopic("all");
                        setTopicMenuOpen(false);
                      }}
                      role="menuitemradio"
                      type="button"
                    >
                      All topics
                      {selectedTopic === "all" ? <span>✓</span> : null}
                    </button>
                    <div className="my-1.5 border-t border-white/[0.08]" />
                    {WORKSPACE_TOPIC_VALUES.map(topic => {
                      const isSelected = selectedTopic === topic;
                      return (
                        <button
                          aria-checked={isSelected}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-semibold transition ${isSelected ? "bg-[#aeb9ff] text-[#07080b]" : "text-white/60 hover:bg-white/[0.07] hover:text-white"}`}
                          key={topic}
                          onClick={() => {
                            setSelectedTopic(topic);
                            setTopicMenuOpen(false);
                          }}
                          role="menuitemradio"
                          type="button"
                        >
                          {WORKSPACE_TOPIC_LABELS[topic]}
                          {isSelected ? <span>✓</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {status === "loading" ? (
          <div className="flex items-center gap-3 py-16 text-sm text-white/50">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Loading the latest public cycle…
          </div>
        ) : null}
        {status === "error" ? (
          <div className="mt-8 rounded-2xl border border-[#a94c37]/40 bg-[#a94c37]/10 p-6 text-sm text-white/70">
            <p>The public workspace could not be loaded.</p>
            <button
              className="mt-3 font-semibold text-white underline underline-offset-4"
              onClick={retry}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}
        {status === "ready" && visibleChanges.length === 0 ? (
          <div className="border-b border-white/10 py-20">
            <Sparkles className="h-5 w-5 text-[#aeb9ff]" />
            <h2 className="mt-5 text-2xl font-medium tracking-[-0.04em]">
              The next source-linked cycle is on its way.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              When the first Sunday or Wednesday cycle completes, changes will
              appear here grouped by policy type and subject area, with grounded
              ideas available to select and expand.
            </p>
          </div>
        ) : null}

        <div className="divide-y divide-white/10">
          {visibleChanges.map(change => {
            const ideas = ideasByChange.get(change.id) ?? [];
            return (
              <article className="py-10 lg:py-12" key={change.id}>
                <div className="grid gap-8 lg:grid-cols-[12rem_minmax(0,1fr)_18rem] lg:gap-12">
                  <div className="text-xs uppercase tracking-[0.12em] text-white/40">
                    <span>{change.jurisdiction?.flag_emoji ?? "◎"}</span>{" "}
                    {change.jurisdiction?.name ?? "Global"}
                    <br />
                    <span className="mt-2 inline-block normal-case tracking-normal text-white/35">
                      {formatDate(change.published_at)}
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.11em] text-white/45">
                      <span className="rounded-full border border-[#aeb9ff]/30 bg-[#aeb9ff]/10 px-2 py-1 text-[#cbd2ff]">
                        {typeLabels[change.change_type]}
                      </span>
                      <span>{change.importance}</span>
                      {change.topics.map(topic => (
                        <span
                          className="rounded-full border border-white/10 px-2 py-1 text-[0.62rem] normal-case tracking-normal text-white/45"
                          key={topic}
                        >
                          {WORKSPACE_TOPIC_LABELS[topic]}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-4 max-w-3xl text-2xl font-medium leading-tight tracking-[-0.04em] sm:text-3xl">
                      {change.headline}
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">
                      {change.summary}
                    </p>
                    <a
                      className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-white/65 transition hover:text-white"
                      href={change.canonical_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      Read {change.source_name}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#cbd2ff]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Potential idea
                    </div>
                    {ideas.length ? (
                      <div className="mt-5 space-y-3">
                        {ideas.map(idea => {
                          const isSelected = selectedIdeaId === idea.id;
                          return (
                            <button
                              aria-expanded={isSelected}
                              aria-haspopup="dialog"
                              aria-label={`${isSelected ? "Close" : "Open"} brief PRD for ${idea.title}`}
                              className={`w-full rounded-xl border p-4 text-left transition ${isSelected ? "border-[#aeb9ff]/70 bg-[#aeb9ff]/10" : "border-white/10 bg-black/10 hover:border-white/25"}`}
                              key={idea.id}
                              onClick={() =>
                                setSelectedIdeaId(current =>
                                  current === idea.id ? null : idea.id
                                )
                              }
                              type="button"
                            >
                              <span className="block text-sm font-semibold leading-5 text-white">
                                {idea.title}
                              </span>
                              <span className="mt-3 block text-[0.62rem] uppercase tracking-[0.12em] text-white/35">
                                {isSelected ? "Selected" : "Select to expand"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-5 text-sm leading-6 text-white/45">
                        No grounded project idea was generated for this change.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {selectedIdea && selectedChange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <button
            aria-label="Close brief PRD"
            className="absolute inset-0 cursor-default bg-black/70"
            onClick={() => setSelectedIdeaId(null)}
            type="button"
          />
          <section
            aria-labelledby="workspace-prd-title"
            aria-modal="true"
            className="relative flex max-h-[min(900px,calc(100vh-2rem))] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#17191f] shadow-2xl"
            onClick={event => event.stopPropagation()}
            role="dialog"
          >
            <header className="flex items-start justify-between gap-6 border-b border-white/10 px-5 py-5 sm:px-8 sm:py-7">
              <div className="min-w-0">
                <EditorialLabel>Brief PRD</EditorialLabel>
                <h2
                  className="mt-3 max-w-2xl text-2xl font-medium leading-tight tracking-[-0.05em] text-white sm:text-4xl"
                  id="workspace-prd-title"
                >
                  {selectedIdea.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/55">
                  A detailed, source-grounded PRD that explains the policy,
                  system design, operating workflow, controls, and delivery
                  path.
                </p>
              </div>
              <button
                aria-label="Close brief PRD"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/65 transition hover:border-white/35 hover:bg-white/10 hover:text-white"
                onClick={() => setSelectedIdeaId(null)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-8">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-10">
                <article className="min-w-0 space-y-1 break-words [overflow-wrap:anywhere]">
                  {renderPrd(selectedPrd)}
                </article>

                <aside className="self-start rounded-2xl border border-white/10 bg-black/20 p-5">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[#cbd2ff]">
                    Policy context
                  </p>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    {selectedChange.summary}
                  </p>
                  <p className="mt-5 text-xs leading-5 text-white/40">
                    This context is based on the official source record. The PRD
                    below is a proposed product response, not a legal opinion.
                  </p>
                </aside>
              </div>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 px-5 py-4 sm:px-8">
              <a
                className="inline-flex items-center gap-2 text-xs font-semibold text-white/60 transition hover:text-white"
                href={selectedChange.canonical_url}
                rel="noreferrer"
                target="_blank"
              >
                Official source: {selectedChange.source_name}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold text-[#07080b] transition hover:bg-[#dfe3ff]"
                onClick={() =>
                  downloadPdf(selectedIdea, selectedChange, selectedExpansion)
                }
                type="button"
              >
                <Download className="h-3.5 w-3.5" />
                Download PDF
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      <footer className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-6 py-10 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-10 lg:px-16 xl:px-20">
        <span>Brief — public policy intelligence workspace</span>
        <a
          className="inline-flex items-center gap-2 font-semibold text-white/55 hover:text-white"
          href="https://github.com/koustavdatascience/brief-global-open"
          rel="noreferrer"
          target="_blank"
        >
          <Github className="h-3.5 w-3.5" />
          Open source on GitHub
        </a>
      </footer>
    </main>
  );
}
