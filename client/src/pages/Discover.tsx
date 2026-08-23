import React, { useCallback, useEffect, useState } from "react";
import BrandMark from "@/components/BrandMark";
import EditorialLabel from "@/components/EditorialLabel";
import {
  listPublicJurisdictions,
  listPublicSignals,
  type PublicJurisdiction,
  type PublicSignal,
} from "@/lib/publicApi";
import { ArrowUpRight, CircleAlert, Download, Globe2 } from "lucide-react";
import { Link } from "wouter";

const importanceTone = {
  watch: "border-[#16313b]/10 bg-[#eef1ed] text-[#456255]",
  notable: "border-[#b68042]/25 bg-[#fbf2df] text-[#9a5c1e]",
  material: "border-[#a94c37]/25 bg-[#f9e9e4] text-[#a94c37]",
} as const;

export default function Discover() {
  const [signals, setSignals] = useState<PublicSignal[]>([]);
  const [jurisdictions, setJurisdictions] = useState<PublicJurisdiction[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    void Promise.all([
      listPublicSignals(controller.signal),
      listPublicJurisdictions(controller.signal),
    ])
      .then(([nextSignals, nextJurisdictions]) => {
        setSignals(nextSignals);
        setJurisdictions(nextJurisdictions);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setStatus("error");
      });
    return () => controller.abort();
  }, [reloadCount]);

  const retry = useCallback(() => setReloadCount(count => count + 1), []);

  const downloadBriefing = () => {
    if (!signals.length || typeof window === "undefined") return;
    const rows = signals.map(signal => [
      signal.jurisdiction?.name ?? "Global",
      new Date(signal.published_at).toISOString().slice(0, 10),
      signal.importance,
      signal.signal_type,
      signal.headline,
      signal.summary,
      signal.canonical_url,
    ]);
    const escapeCsv = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const csv = [
      [
        "Jurisdiction",
        "Published",
        "Importance",
        "Type",
        "Headline",
        "Summary",
        "Source",
      ],
      ...rows,
    ]
      .map(row => row.map(escapeCsv).join(","))
      .join("\n");
    const blobUrl = window.URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = "brief-public-signals.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(blobUrl);
  };

  return (
    <main className="min-h-screen bg-[var(--brief-paper)] text-[var(--brief-ink)]">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:px-10">
        <Link href="/" aria-label="Brief home">
          <BrandMark />
        </Link>
        <Link
          className="rounded-lg bg-[var(--brief-ink)] px-3 py-2 text-sm font-semibold text-[var(--brief-paper)] transition hover:bg-[var(--brief-accent)]"
          href="/"
        >
          About Brief
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-12 pt-8 sm:px-8 sm:pb-16 lg:px-10">
        <EditorialLabel>Global discovery</EditorialLabel>
        <div className="mt-5 grid gap-8 border-b border-[var(--brief-rule)] pb-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
          <div>
            <h1 className="max-w-3xl font-display text-5xl leading-[0.94] tracking-[-0.05em] sm:text-6xl">
              Policy change, in{" "}
              <em className="font-normal text-[var(--brief-accent)]">
                context.
              </em>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--brief-muted)]">
              A public view of curated regulatory and market-access signals.
              Open the source, understand the jurisdiction, then decide whether
              it matters.
            </p>
          </div>
          <aside className="rounded-xl border border-[var(--brief-rule)] bg-white/55 p-5 text-sm leading-6 text-[var(--brief-muted)]">
            <Globe2 className="h-5 w-5 text-[var(--brief-accent)]" />
            <p className="mt-4 font-semibold text-[var(--brief-ink)]">
              Free to use
            </p>
            <p className="mt-1">
              Read, search, and download published cards without an account.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--brief-rule)] pb-4">
          <div>
            <EditorialLabel>Latest signals</EditorialLabel>
            <p className="mt-2 text-sm text-[var(--brief-muted)]">
              {signals.length} published signals across {jurisdictions.length}{" "}
              public jurisdictions.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--brief-rule)] px-3 py-2 text-xs font-semibold text-[var(--brief-ink)] transition hover:border-[var(--brief-accent)] hover:text-[var(--brief-accent)] disabled:opacity-60"
            disabled={!signals.length}
            onClick={downloadBriefing}
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            Download briefing
          </button>
        </div>

        {status === "loading" ? (
          <p className="py-12 text-sm text-[var(--brief-muted)]">
            Loading the public signal feed…
          </p>
        ) : null}
        {status === "error" ? (
          <div className="mt-8 rounded-xl border border-[#a94c37]/25 bg-[#f9e9e4] p-5 text-sm text-[#883e2d]">
            <CircleAlert className="mb-2 h-5 w-5" />
            The public signal feed could not be loaded.{" "}
            <button
              className="font-semibold underline underline-offset-4"
              onClick={retry}
              type="button"
            >
              Retry
            </button>
          </div>
        ) : null}
        {status === "ready" && signals.length === 0 ? (
          <div className="py-12 text-sm leading-6 text-[var(--brief-muted)]">
            The public feed is being curated. Return soon for the first
            published signals.
          </div>
        ) : null}
        <div className="divide-y divide-[var(--brief-rule)]">
          {signals.map(signal => (
            <article
              className="grid gap-5 py-7 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-start"
              key={signal.id}
            >
              <div className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--brief-muted)]">
                {signal.jurisdiction?.flag_emoji
                  ? `${signal.jurisdiction.flag_emoji} `
                  : ""}
                {signal.jurisdiction?.name ?? "Global"}
                <br />
                <span className="mt-2 inline-block normal-case tracking-normal">
                  {new Date(signal.published_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] ${importanceTone[signal.importance]}`}
                  >
                    {signal.importance}
                  </span>
                  <span className="text-xs uppercase tracking-[0.12em] text-[var(--brief-muted)]">
                    {signal.signal_type.replace("_", " ")}
                  </span>
                </div>
                <h2 className="mt-3 max-w-2xl font-display text-2xl leading-tight tracking-[-0.025em]">
                  {signal.headline}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brief-muted)]">
                  {signal.summary}
                </p>
              </div>
              <a
                aria-label={`Open source for ${signal.headline}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--brief-rule)] text-[var(--brief-ink)] transition hover:border-[var(--brief-accent)] hover:text-[var(--brief-accent)]"
                href={signal.canonical_url}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
