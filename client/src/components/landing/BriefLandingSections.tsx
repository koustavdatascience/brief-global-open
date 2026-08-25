import { useEffect, useRef, useState } from "react";
import BlurredStagger from "@/components/BlurredStagger";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  ChevronDown,
  CircleDot,
  Code2,
  Eye,
  GitPullRequest,
  MoreHorizontal,
  Plus,
  ShieldCheck,
  BookOpen,
  Check,
  GitBranch,
  Link2,
  Radar,
  Search,
  TimerReset,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BriefStep = readonly [string, string];
export type BriefPrinciple = {
  icon: LucideIcon;
  title: string;
  description: string;
};

type WorkflowId = "signals" | "alerts" | "timeline" | "integrations";

type WorkflowItem = {
  id: WorkflowId;
  number: string;
  label: string;
  title: string;
  description: string;
  detail: string;
  icon: LucideIcon;
};

const workflowItems: readonly WorkflowItem[] = [
  {
    id: "signals",
    number: "01",
    label: "Signals",
    title: "Find the changes worth noticing.",
    description:
      "Start with a focused view of consequential policy movement across the jurisdictions you care about.",
    detail: "Curated public intelligence",
    icon: Radar,
  },
  {
    id: "alerts",
    number: "02",
    label: "Alerts",
    title: "Know when the picture moves.",
    description:
      "Keep important developments visible with clear importance levels and source context attached from the start.",
    detail: "Importance, not inbox noise",
    icon: BellRing,
  },
  {
    id: "timeline",
    number: "03",
    label: "Timeline",
    title: "Follow a change through time.",
    description:
      "Read each development in context with dates, jurisdiction, policy type, and an official source close at hand.",
    detail: "Evidence stays connected",
    icon: TimerReset,
  },
  {
    id: "integrations",
    number: "04",
    label: "Integrations",
    title: "Take the public feed with you.",
    description:
      "Download already-public signals as a local CSV and use the open repository to understand the portable stack.",
    detail: "Open by design",
    icon: Link2,
  },
];

export function BriefNavigation() {
  return (
    <>
      <nav
        aria-label="Public navigation"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 text-[0.7rem] font-normal text-white/45 lg:flex"
      >
        <a className="transition-colors hover:text-white" href="#method">
          Signals
        </a>
        <a className="transition-colors hover:text-white" href="#docs">
          Guides
        </a>
        <a
          className="transition-colors hover:text-white"
          href="https://github.com/koustavdatascience/brief-global-open"
          target="_blank"
          rel="noreferrer"
        >
          GitHub
        </a>
      </nav>
      <div className="ml-auto flex items-center gap-2 text-[0.68rem] font-medium text-white/55">
        <a
          className="inline-flex h-[30px] items-center rounded-full border border-white/80 bg-white px-3.5 text-[0.68rem] font-medium text-[#07080b] shadow-[0_0_24px_rgba(255,255,255,0.08)] transition hover:bg-[#ececec]"
          href="/workspace"
        >
          Open Brief
        </a>
      </div>
    </>
  );
}

export function ReferenceHeroPreview() {
  return (
    <div className="brief-reference-preview ib-reveal ib-reveal-delay-3 relative mx-auto mt-12 aspect-[2.215] w-full overflow-hidden rounded-[1.1rem] border border-white/10 bg-[#d0d0cc] shadow-[0_38px_110px_rgba(0,0,0,0.45)] sm:mt-14">
      <div className="brief-reference-landscape" aria-hidden="true" />
      <div className="brief-reference-haze" aria-hidden="true" />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        aria-hidden="true"
      />
      <div className="absolute left-1/2 top-[8%] w-[16%] min-w-[12rem] max-w-[17rem] -translate-x-1/2 rounded-[1.7rem] border-[0.55rem] border-[#090a0d] bg-[#07080b] p-2 shadow-[0_18px_55px_rgba(0,0,0,0.6)] sm:top-[8%] sm:w-[16%] sm:min-w-[13rem]">
        <div className="rounded-[1.1rem] border border-white/10 bg-[#11151c] px-3 pb-5 pt-3 sm:px-4 sm:pb-7 sm:pt-4">
          <div className="flex items-center gap-2 rounded-full bg-white/[0.08] px-2.5 py-1.5 font-mono text-[0.43rem] text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-[#aeb9ff]" />
            Public signal recap is ready.
          </div>
          <p className="mt-7 font-mono text-[0.45rem] uppercase tracking-[0.16em] text-[#aeb9ff]">
            European Union
          </p>
          <p className="mt-2 text-left text-[2rem] font-medium leading-[0.9] tracking-[-0.08em] text-white sm:text-[2.7rem]">
            May
            <span className="block text-white/45">2026</span>
          </p>
          <div className="mt-8 flex h-28 items-end justify-between gap-2 border-b border-white/10 px-1 sm:h-36">
            {[18, 31, 24, 45, 39, 62, 78].map((height, index) => (
              <span
                className={`w-px ${index === 6 ? "bg-[#b85536]" : "bg-white/65"}`}
                key={height}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between font-mono text-[0.43rem] uppercase tracking-[0.12em] text-white/35">
            <span>Signal totals</span>
            <span>Source linked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Retained for compatibility with the first Dusk-inspired implementation.
 * The landing page uses ReferenceHeroPreview for the reference-matched layout.
 */
export function HeroPreview() {
  return (
    <div className="brief-hero-preview ib-reveal ib-reveal-delay-3 relative mx-auto mt-16 w-full max-w-[1120px] overflow-hidden rounded-[1.75rem] border border-white/12 bg-[#11151e] shadow-[0_42px_120px_rgba(0,0,0,0.48)] md:mt-20">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(113,132,255,0.22),transparent_34%),linear-gradient(180deg,#191e2a_0%,#0b0e14_70%)]" />
      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 text-[0.58rem] uppercase tracking-[0.16em] text-white/45 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid h-5 w-5 place-items-center rounded-md bg-white text-[0.5rem] font-bold tracking-[-0.08em] text-[#07080b]">
            B.
          </span>
          <span>Brief / Public discovery</span>
        </div>
        <div className="hidden items-center gap-5 sm:flex">
          <span>Signals</span>
          <span>Jurisdictions</span>
          <span>Export</span>
        </div>
      </div>
      <div className="relative mx-auto min-h-[23rem] max-w-[980px] px-5 pb-8 pt-8 sm:min-h-[31rem] sm:px-10 sm:pt-12">
        <div className="absolute inset-x-8 top-10 h-40 rounded-full bg-[#7184ff]/10 blur-3xl sm:inset-x-28 sm:top-16" />
        <div className="relative grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden rounded-2xl border border-white/10 bg-black/20 p-5 lg:block">
            <div className="flex items-center justify-between text-[0.55rem] uppercase tracking-[0.14em] text-white/40">
              <span>Jurisdictions</span>
              <Search className="h-3.5 w-3.5" />
            </div>
            <div className="mt-6 space-y-3">
              {["European Union", "United Kingdom", "India", "Singapore"].map(
                (name, index) => (
                  <div
                    className={`flex items-center justify-between rounded-lg border px-3 py-3 text-sm ${index === 0 ? "border-[#7184ff]/50 bg-[#7184ff]/10 text-white" : "border-white/8 text-white/45"}`}
                    key={name}
                  >
                    <span>{name}</span>
                    <span className="font-mono text-[0.55rem] text-white/35">
                      0{index + 1}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-white/12 bg-[#080a0e]/80 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[0.57rem] uppercase tracking-[0.14em] text-[#aeb9ff]">
                  Public signals
                </p>
                <p className="mt-2 text-lg font-medium tracking-[-0.04em] text-white">
                  What changed this week
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 font-mono text-[0.53rem] uppercase tracking-[0.12em] text-white/50">
                06 jurisdictions
              </span>
            </div>
            <div className="mt-7 space-y-3">
              <div className="rounded-xl border border-[#7184ff]/45 bg-[#7184ff]/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-[#cbd2ff]">
                    EU · AI governance
                  </span>
                  <span className="rounded-full bg-[#7184ff]/20 px-2 py-1 text-[0.52rem] uppercase tracking-[0.12em] text-[#dce2ff]">
                    Material
                  </span>
                </div>
                <p className="mt-4 text-xl font-medium tracking-[-0.045em] text-white">
                  New transparency requirements enter force.
                </p>
                <p className="mt-2 text-xs leading-5 text-white/45">
                  Read the plain-language signal, then open the official source.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {["Data governance guidance", "Digital market update"].map(
                  title => (
                    <div
                      className="rounded-xl border border-white/9 bg-white/[0.035] p-4"
                      key={title}
                    >
                      <span className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-white/35">
                        Published · source linked
                      </span>
                      <p className="mt-3 text-sm font-medium leading-5 text-white/80">
                        {title}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowVisual({ item }: { item: WorkflowItem }) {
  if (item.id === "signals") {
    return (
      <div className="relative h-full min-h-[25rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#090b10] p-5 sm:p-7">
        <div className="brief-workflow-glow" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[0.57rem] uppercase tracking-[0.15em] text-white/40">
            Signal board
          </span>
          <Radar className="h-4 w-4 text-[#aeb9ff]" />
        </div>
        <div className="relative z-10 mt-10 grid gap-3">
          {[
            ["AI governance", "European Union", "Material"],
            ["Data protection", "United Kingdom", "Watch"],
            ["Digital markets", "Singapore", "New"],
          ].map(([type, jurisdiction, tag], index) => (
            <div
              className={`rounded-xl border p-4 ${index === 0 ? "border-[#7184ff]/45 bg-[#7184ff]/10" : "border-white/9 bg-white/[0.035]"}`}
              key={type}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.53rem] uppercase tracking-[0.12em] text-white/40">
                  {jurisdiction}
                </span>
                <span className="text-[0.53rem] uppercase tracking-[0.12em] text-[#aeb9ff]">
                  {tag}
                </span>
              </div>
              <p className="mt-3 text-sm font-medium text-white/85">{type}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.id === "alerts") {
    return (
      <div className="relative min-h-[25rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#090b10] p-5 sm:p-7">
        <div className="brief-alert-pulse" aria-hidden="true" />
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[0.57rem] uppercase tracking-[0.15em] text-white/40">
            Attention queue
          </span>
          <BellRing className="h-4 w-4 text-[#aeb9ff]" />
        </div>
        <div className="relative z-10 mt-12 flex items-center gap-5">
          <div className="grid h-16 w-16 place-items-center rounded-2xl border border-[#7184ff]/40 bg-[#7184ff]/15 text-[#cbd2ff] shadow-[0_0_35px_rgba(113,132,255,0.2)]">
            <BellRing className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-semibold tracking-[-0.06em] text-white">
              03
            </p>
            <p className="mt-1 text-sm text-white/45">
              signals worth a closer look
            </p>
          </div>
        </div>
        <div className="relative z-10 mt-12 grid gap-3 sm:grid-cols-3">
          {[
            ["Importance", "Material"],
            ["Jurisdiction", "EU"],
            ["Evidence", "Linked"],
          ].map(([label, value]) => (
            <div
              className="rounded-xl border border-white/9 bg-white/[0.035] p-4"
              key={label}
            >
              <p className="font-mono text-[0.52rem] uppercase tracking-[0.12em] text-white/35">
                {label}
              </p>
              <p className="mt-3 text-sm font-medium text-white/80">{value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (item.id === "timeline") {
    return (
      <div className="relative min-h-[25rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#090b10] p-5 sm:p-7">
        <div className="relative z-10 flex items-center justify-between">
          <span className="font-mono text-[0.57rem] uppercase tracking-[0.15em] text-white/40">
            Evidence timeline
          </span>
          <TimerReset className="h-4 w-4 text-[#aeb9ff]" />
        </div>
        <div className="relative z-10 mt-10 space-y-0">
          {[
            ["31 Jul", "Signal published", "Summary and source attached"],
            ["01 Aug", "Source reviewed", "Official policy page confirmed"],
            ["02 Aug", "Context updated", "Jurisdiction context retained"],
          ].map(([date, title, copy], index) => (
            <div className="relative flex gap-5 pb-8" key={date}>
              {index < 2 && (
                <span className="absolute left-[0.45rem] top-5 h-full w-px bg-white/12" />
              )}
              <span className="relative mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#7184ff] shadow-[0_0_14px_rgba(113,132,255,0.65)]" />
              <div>
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.12em] text-[#aeb9ff]">
                  {date}
                </p>
                <p className="mt-2 text-base font-medium text-white/85">
                  {title}
                </p>
                <p className="mt-1 text-sm text-white/40">{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[25rem] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#090b10] p-5 sm:p-7">
      <div className="relative z-10 flex items-center justify-between">
        <span className="font-mono text-[0.57rem] uppercase tracking-[0.15em] text-white/40">
          Open surface
        </span>
        <GitBranch className="h-4 w-4 text-[#aeb9ff]" />
      </div>
      <div className="relative z-10 mt-10 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#7184ff]/15 text-[#cbd2ff]">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-white/85">
              brief-global-open
            </p>
            <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.12em] text-white/35">
              Apache-2.0 · public repository
            </p>
          </div>
        </div>
        <div className="mt-7 space-y-3">
          {["README.md", "docs/architecture.md", "CONTRIBUTING.md"].map(
            file => (
              <div
                className="flex items-center justify-between rounded-lg border border-white/8 bg-black/15 px-3 py-3 text-sm text-white/55"
                key={file}
              >
                <span className="font-mono text-[0.62rem]">{file}</span>
                <Check className="h-4 w-4 text-[#7184ff]" />
              </div>
            )
          )}
        </div>
      </div>
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[0.58rem] uppercase tracking-[0.12em] text-white/35">
        <span className="rounded-full border border-white/10 px-3 py-2">
          Portable
        </span>
        <span className="rounded-full border border-white/10 px-3 py-2">
          Inspectable
        </span>
        <span className="rounded-full border border-white/10 px-3 py-2">
          Source-linked
        </span>
      </div>
    </div>
  );
}

export function WorkflowSection() {
  const [activeId, setActiveId] = useState<WorkflowId>("signals");
  const panelRefs = useRef<Partial<Record<WorkflowId, HTMLElement>>>({});
  const featureRows: Record<WorkflowId, readonly string[]> = {
    signals: [
      "Jurisdiction watchlists",
      "Materiality triage",
      "Source-link retention",
    ],
    alerts: [
      "Importance thresholds",
      "Clear attention queues",
      "Context when it matters",
    ],
    timeline: [
      "Chronology views",
      "Official source history",
      "Decision-ready context",
    ],
    integrations: [
      "Portable CSV exports",
      "Public API boundaries",
      "Inspectable open source",
    ],
  };

  useEffect(() => {
    const updateActiveSection = () => {
      const activationLine = window.innerHeight * 0.42;
      let nextId: WorkflowId = workflowItems[0].id;

      workflowItems.forEach(item => {
        const panel = panelRefs.current[item.id];
        if (panel && panel.getBoundingClientRect().top <= activationLine) {
          nextId = item.id;
        }
      });

      setActiveId(current => (current === nextId ? current : nextId));
    };

    let frame: number | null = null;
    const handleScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateActiveSection);
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section
      id="method"
      className="relative border-y border-white/[0.06] bg-[#07080b]"
    >
      <div className="mx-auto w-full max-w-[1275px] px-6 py-[4.5rem] md:px-10 lg:px-0 lg:py-[5rem]">
        <h2 className="max-w-[34rem] text-[1.9rem] font-medium leading-[1.02] tracking-[-0.055em] text-white sm:text-[2.15rem]">
          <BlurredStagger as="span" className="block" delay={80} stagger={18}>
            Built for the full policy workflow.
          </BlurredStagger>
          <BlurredStagger
            as="span"
            className="block text-white/45"
            delay={360}
            stagger={18}
          >
            One connected intelligence surface.
          </BlurredStagger>
        </h2>

        <div className="mt-[5.75rem] grid items-start gap-12 lg:grid-cols-[9.5rem_minmax(0,1fr)] lg:gap-[3.5rem]">
          <aside className="h-fit lg:sticky lg:top-24 lg:z-10 lg:self-start">
            <nav aria-label="Brief workflow sections" className="space-y-3">
              <p className="mb-5 text-[0.7rem] text-white/35">Product</p>
              {workflowItems.map(item => {
                const isActive = item.id === activeId;
                return (
                  <span
                    aria-current={isActive ? "step" : undefined}
                    className={`block text-[0.72rem] transition-colors ${isActive ? "font-semibold text-white" : "font-normal text-white/45"}`}
                    key={item.id}
                  >
                    {item.label}
                  </span>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0">
            {workflowItems.map(item => (
              <article
                className="workflow-panel scroll-mt-32 border-b border-white/[0.06] py-4 first:pt-0 last:border-b-0 last:pb-0 lg:min-h-[39rem]"
                data-workflow-id={item.id}
                id={`workflow-${item.id}`}
                key={item.id}
                ref={element => {
                  panelRefs.current[item.id] = element ?? undefined;
                }}
              >
                <div className="grid min-h-[35rem] gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
                  <div className="flex min-h-[31rem] flex-col pt-1 sm:col-span-2">
                    <div>
                      <div className="flex items-center gap-2 text-[0.7rem] text-white/45">
                        <item.icon className="h-3.5 w-3.5 text-white/45" />
                        <span>{item.label}</span>
                      </div>
                      <h3 className="mt-5 text-[0.95rem] font-semibold leading-6 tracking-[-0.02em] text-white">
                        <BlurredStagger as="span" delay={180} stagger={16}>
                          {item.title}
                        </BlurredStagger>
                      </h3>
                      <p className="mt-1 max-w-[17rem] text-[0.86rem] leading-6 text-white/55">
                        {item.description}
                      </p>
                    </div>
                    <div className="mt-auto border-t border-white/[0.08]">
                      {featureRows[item.id].map(row => (
                        <div
                          className="flex items-center gap-3 border-b border-white/[0.08] py-3 text-[0.74rem] text-white/50"
                          key={row}
                        >
                          <ArrowRight className="h-3.5 w-3.5 text-white/40" />
                          <span>{row}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                    <WorkflowVisual item={item} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function OpenSourceDocs() {
  const rootEntries = [
    [
      ".github/workflows",
      "folder",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/.github/workflows",
    ],
    [
      "client",
      "folder",
      "Add GitHub open source showcase",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/client",
    ],
    [
      "deploy",
      "folder",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/deploy",
    ],
    [
      "docs",
      "folder",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/docs",
    ],
    [
      "scripts",
      "folder",
      "Finalize clean public release",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/scripts",
    ],
    [
      "server",
      "folder",
      "Log safe public data upstream status",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/server",
    ],
    [
      "supabase/migrations",
      "folder",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/tree/main/supabase/migrations",
    ],
    [
      ".gitignore",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/.gitignore",
    ],
    [
      ".prettierignore",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/.prettierignore",
    ],
    [
      ".prettierrc",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/.prettierrc",
    ],
    [
      "CODE_OF_CONDUCT.md",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/CODE_OF_CONDUCT.md",
    ],
    [
      "CONTRIBUTING.md",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/CONTRIBUTING.md",
    ],
    [
      "LICENSE",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/LICENSE",
    ],
    [
      "README.md",
      "file",
      "Add live website link to README",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/README.md",
    ],
    [
      "SECURITY.md",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/SECURITY.md",
    ],
    [
      "TRADEMARK.md",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/TRADEMARK.md",
    ],
    [
      "package.json",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/package.json",
    ],
    [
      "pnpm-lock.yaml",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/pnpm-lock.yaml",
    ],
    [
      "pnpm-workspace.yaml",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/pnpm-workspace.yaml",
    ],
    [
      "render.yaml",
      "file",
      "Initial clean public release",
      "https://github.com/koustavdatascience/brief-global-open/blob/main/render.yaml",
    ],
  ] as const;

  const fileIcon = (kind: "folder" | "file") =>
    kind === "folder" ? (
      <GitBranch className="h-3.5 w-3.5 text-white/45" />
    ) : (
      <Code2 className="h-3.5 w-3.5 text-white/35" />
    );

  return (
    <section id="docs" className="relative bg-[#07080b]">
      <div className="mx-auto w-full max-w-[1240px] px-6 py-24 md:px-10 lg:px-14 lg:py-32">
        <div className="mx-auto max-w-[810px]">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.17em] text-[#aeb9ff]">
            Open source, in the open
          </p>
          <h2 className="mt-5 max-w-[42rem] text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-5xl">
            <BlurredStagger as="span" delay={80} stagger={18}>
              The public stack. Directly from GitHub.
            </BlurredStagger>
          </h2>
          <p className="mt-6 max-w-[36rem] text-base leading-7 text-white/50">
            Browse the actual Brief repository as a source-linked public
            surface: inspect the code, follow the architecture, and open every
            file on GitHub.
          </p>
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-white/10 bg-[#0d1117] shadow-[0_30px_90px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/50 sm:px-5">
            <div className="flex min-w-0 items-center gap-2">
              <a
                className="truncate font-semibold text-white/85 hover:text-white"
                href="https://github.com/koustavdatascience"
                rel="noreferrer"
                target="_blank"
              >
                koustavdatascience
              </a>
              <span>/</span>
              <a
                className="truncate font-semibold text-white/85 hover:text-white"
                href="https://github.com/koustavdatascience/brief-global-open"
                rel="noreferrer"
                target="_blank"
              >
                brief-global-open
              </a>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/35" />
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <a
                className="rounded-md border border-white/10 px-2.5 py-1.5 hover:border-white/20 hover:text-white"
                href="https://github.com/koustavdatascience/brief-global-open"
                rel="noreferrer"
                target="_blank"
              >
                Code
              </a>
              <MoreHorizontal className="h-4 w-4 text-white/35" />
            </div>
          </div>

          <div className="border-b border-white/10 px-4 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap items-center gap-3">
              <a
                className="text-lg font-semibold tracking-[-0.03em] text-white"
                href="https://github.com/koustavdatascience/brief-global-open"
                rel="noreferrer"
                target="_blank"
              >
                brief-global-open
              </a>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[0.62rem] font-medium text-white/55">
                Public
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.68rem] text-white/45">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-white/60">
                <CircleDot className="h-3.5 w-3.5" /> main
              </span>
              <span>1 Branch</span>
              <span>0 Tags</span>
              <span className="sm:ml-auto">20 Commits</span>
            </div>
          </div>

          <div className="grid lg:grid-cols-[minmax(0,1fr)_17rem]">
            <div className="min-w-0 border-b border-white/10 lg:border-b-0 lg:border-r">
              <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-3 sm:px-5">
                <a
                  className="inline-flex items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/20 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open/tree/main"
                  rel="noreferrer"
                  target="_blank"
                >
                  <GitBranch className="h-3.5 w-3.5" /> main{" "}
                  <ChevronDown className="h-3 w-3" />
                </a>
                <a
                  className="ml-auto hidden items-center gap-2 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:border-white/20 hover:text-white sm:inline-flex"
                  href="https://github.com/koustavdatascience/brief-global-open"
                  rel="noreferrer"
                  target="_blank"
                >
                  Go to file{" "}
                  <span className="font-mono text-[0.58rem] text-white/35">
                    T
                  </span>
                </a>
                <a
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/65 hover:border-white/20 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Plus className="h-3.5 w-3.5" /> Add file{" "}
                  <ChevronDown className="h-3 w-3" />
                </a>
              </div>

              <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 text-[0.68rem] text-white/50 sm:px-5">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-[#2f81f7] text-[0.55rem] font-bold text-white">
                  K
                </div>
                <span className="font-medium text-white/75">
                  koustavdatascience
                </span>
                <span className="truncate">
                  Add GitHub open source showcase
                </span>
                <span className="ml-auto hidden shrink-0 sm:inline">
                  354471a · 20 Commits
                </span>
              </div>

              <div className="divide-y divide-white/[0.08]">
                {rootEntries.map(([name, kind, message, href]) => (
                  <a
                    className="group grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 px-4 py-2.5 text-[0.68rem] transition hover:bg-white/[0.04] sm:px-5"
                    href={href}
                    key={name}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="flex min-w-0 items-center gap-2 font-medium text-white/75 group-hover:text-[#58a6ff]">
                      {fileIcon(kind)}
                      <span className="truncate">{name}</span>
                    </span>
                    <span className="hidden truncate text-white/35 sm:block">
                      {message}
                    </span>
                    <span className="hidden text-right text-white/30 md:block">
                      public
                    </span>
                  </a>
                ))}
              </div>

              <div className="flex items-center justify-center border-t border-white/10 px-4 py-4">
                <a
                  className="text-xs font-medium text-[#58a6ff] hover:underline"
                  href="https://github.com/koustavdatascience/brief-global-open"
                  rel="noreferrer"
                  target="_blank"
                >
                  View all files on GitHub{" "}
                  <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            <aside className="bg-white/[0.018] p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white/85">About</p>
                <a
                  href="https://github.com/koustavdatascience/brief-global-open"
                  rel="noreferrer"
                  target="_blank"
                >
                  <MoreHorizontal className="h-4 w-4 text-white/35 hover:text-white" />
                </a>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/65">
                Account-free, source-linked public feed for global policy
                intelligence.
              </p>
              <a
                className="mt-4 block truncate text-xs text-[#58a6ff] hover:underline"
                href="https://brief-global-open.onrender.com"
                rel="noreferrer"
                target="_blank"
              >
                brief-global-open.onrender.com
              </a>
              <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs text-white/50">
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open#readme"
                  rel="noreferrer"
                  target="_blank"
                >
                  <BookOpen className="h-3.5 w-3.5" /> Readme
                </a>
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open/blob/main/LICENSE"
                  rel="noreferrer"
                  target="_blank"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Apache-2.0 license
                </a>
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open/blob/main/CODE_OF_CONDUCT.md"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Code2 className="h-3.5 w-3.5" /> Code of conduct
                </a>
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open/blob/main/CONTRIBUTING.md"
                  rel="noreferrer"
                  target="_blank"
                >
                  <GitPullRequest className="h-3.5 w-3.5" /> Contributing
                </a>
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open/blob/main/SECURITY.md"
                  rel="noreferrer"
                  target="_blank"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Security policy
                </a>
                <a
                  className="flex items-center gap-2 hover:text-white"
                  href="https://github.com/koustavdatascience/brief-global-open"
                  rel="noreferrer"
                  target="_blank"
                >
                  <Eye className="h-3.5 w-3.5" /> Activity
                </a>
              </div>
              <div className="mt-6 border-t border-white/10 pt-5">
                <p className="text-xs font-semibold text-white/70">Languages</p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-white/10">
                  <span className="w-[89%] bg-[#3178c6]" />
                  <span className="w-[4.6%] bg-[#4f5d95]" />
                  <span className="w-[4.1%] bg-[#f1e05a]" />
                  <span className="w-[1.7%] bg-[#f1e05a]" />
                  <span className="w-[0.6%] bg-[#e34c26]" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-y-2 text-[0.62rem] text-white/40">
                  <span>● TypeScript 89%</span>
                  <span>● PLpgSQL 4.6%</span>
                  <span>● CSS 4.1%</span>
                  <span>● JavaScript 1.7%</span>
                  <span>● HTML 0.6%</span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Kept as a compatibility export for the original component contract. The
 * visible landing page now uses HeroPreview instead of rendering this card.
 */
export function SignalBoard() {
  return <span className="sr-only">Global discovery</span>;
}

export function WorkflowSteps({ steps }: { steps: readonly BriefStep[] }) {
  return (
    <div className="ib-reveal ib-reveal-delay-3 mt-14 grid gap-3 sm:grid-cols-3 lg:mt-20">
      {steps.map(([label, copy], index) => (
        <article
          className="brief-dusk-card group rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
          key={label}
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.61rem] uppercase tracking-[0.13em] text-[#8d9cff]">
              0{index + 1}
            </p>
            <ArrowUpRight className="h-4 w-4 text-white/20 transition group-hover:text-white/70" />
          </div>
          <h3 className="mt-12 text-lg font-semibold tracking-[-0.035em] text-white">
            {label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-white/45">{copy}</p>
        </article>
      ))}
    </div>
  );
}

export function PrincipleCards({
  principles,
}: {
  principles: readonly BriefPrinciple[];
}) {
  return (
    <div className="mt-10 grid gap-3 md:grid-cols-2">
      {principles.map(({ icon: Icon, title, description }) => (
        <article
          className="group rounded-2xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]"
          key={title}
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-[#7184ff]/10 text-[#aeb9ff]">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <h3 className="mt-12 text-xl font-semibold tracking-[-0.04em] text-white">
            {title}
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
            {description}
          </p>
        </article>
      ))}
    </div>
  );
}

export function AccessInvitation() {
  return (
    <section
      id="discover"
      className="relative overflow-hidden border-t border-white/10 bg-black text-white"
    >
      <div className="relative mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-20 md:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-14 lg:py-28">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-[#aeb9ff]">
            Built for public attention
          </p>
          <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-6xl">
            <BlurredStagger as="span" delay={80} stagger={18}>
              Browse what matters. Keep the source close.
            </BlurredStagger>
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/55">
            Every published card is free to read, link, and download. No account
            is required.
          </p>
        </div>
        <div className="flex items-end lg:justify-end">
          <a
            className="group inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#07080b] transition hover:bg-[#dce2ff]"
            href="/workspace"
          >
            Browse Brief
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function BriefHeroCopy() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
      <h1 className="ib-reveal ib-reveal-delay-1 max-w-3xl text-balance text-[1.85rem] font-medium leading-[1.02] tracking-[-0.05em] text-white sm:text-[2.2rem] lg:text-[2.5rem]">
        <BlurredStagger as="span" className="block" delay={120} stagger={18}>
          Know the change.
        </BlurredStagger>
        <BlurredStagger
          as="span"
          className="block text-white"
          delay={420}
          stagger={18}
        >
          Make the call.
        </BlurredStagger>
      </h1>
      <BlurredStagger
        as="p"
        className="mt-5 max-w-xl text-sm leading-6 text-white/45 sm:text-base"
        delay={760}
        stagger={16}
      >
        Global policy intelligence
      </BlurredStagger>
    </div>
  );
}
