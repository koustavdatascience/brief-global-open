import React from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  LockKeyhole,
  Radar,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type BriefStep = readonly [string, string];
export type BriefPrinciple = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function BriefNavigation() {
  return (
    <nav
      aria-label="Public navigation"
      className="flex items-center gap-5 text-sm font-medium text-[#606875] sm:gap-7"
    >
      <a className="hover:text-[#111827]" href="/workspace">
        Explore
      </a>
      <a className="hidden hover:text-[#111827] sm:inline" href="#method">
        How it works
      </a>
      <a
        className="rounded-lg bg-[#111827] px-4 py-2 text-white hover:bg-[#3e5ae8]"
        href="/workspace"
      >
        Open Brief
      </a>
    </nav>
  );
}

export function SignalBoard() {
  return (
    <aside className="ib-reveal ib-reveal-delay-2 overflow-hidden rounded-2xl border border-[#e6e8ed] bg-white shadow-[0_24px_70px_rgba(17,24,39,0.08)]">
      <div className="flex items-center justify-between border-b border-[#e6e8ed] px-5 py-4">
        <span className="font-mono text-[0.61rem] uppercase tracking-[0.1em] text-[#7a8290]">
          Global discovery
        </span>
        <span className="flex items-center gap-2 text-xs font-medium text-[#3e5ae8]">
          <span className="h-2 w-2 rounded-full bg-[#3e5ae8]" />
          Open access
        </span>
      </div>
      <div className="p-5 sm:p-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef1ff] text-[#3e5ae8]">
          <Globe2 className="h-5 w-5" />
        </div>
        <h2 className="mt-7 max-w-sm text-3xl font-semibold leading-[1.03] tracking-[-0.055em] text-[#111827] sm:text-4xl">
          A quieter way to follow policy change.
        </h2>
        <p className="mt-4 max-w-sm text-base leading-6 text-[#68707d]">
          A public, source-linked view of the changes worth noticing.
        </p>
        <div className="mt-8 grid grid-cols-3 divide-x divide-[#e6e8ed] rounded-xl border border-[#e6e8ed] bg-[#fafbfc]">
          <div className="p-3">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-[#89919d]">
              Access
            </p>
            <p className="mt-2 text-sm font-medium text-[#111827]">Free</p>
          </div>
          <div className="p-3">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-[#89919d]">
              Evidence
            </p>
            <p className="mt-2 text-sm font-medium text-[#111827]">Linked</p>
          </div>
          <div className="p-3">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.1em] text-[#89919d]">
              Export
            </p>
            <p className="mt-2 text-sm font-medium text-[#111827]">Open</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function WorkflowSteps({ steps }: { steps: readonly BriefStep[] }) {
  return (
    <div
      id="method"
      className="ib-reveal ib-reveal-delay-3 mt-14 grid gap-4 sm:grid-cols-3 lg:mt-20"
    >
      {steps.map(([label, copy], index) => (
        <article
          className="rounded-xl border border-[#e6e8ed] bg-white p-5"
          key={label}
        >
          <p className="font-mono text-[0.61rem] uppercase tracking-[0.1em] text-[#3e5ae8]">
            0{index + 1}
          </p>
          <h3 className="mt-7 text-lg font-semibold tracking-[-0.035em] text-[#111827]">
            {label}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#68707d]">{copy}</p>
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
    <div className="mt-10 grid gap-4 md:grid-cols-2">
      {principles.map(({ icon: Icon, title, description }) => (
        <article
          className="rounded-xl border border-[#e6e8ed] bg-white p-6"
          key={title}
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f1f3f5] text-[#3e5ae8]">
            <Icon className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <h3 className="mt-8 text-xl font-semibold tracking-[-0.04em] text-[#111827]">
            {title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#68707d]">{description}</p>
        </article>
      ))}
    </div>
  );
}

export function AccessInvitation() {
  return (
    <section
      id="discover"
      className="border-t border-[#e6e8ed] bg-[#111827] text-white"
    >
      <div className="mx-auto grid w-full max-w-[1180px] gap-9 px-6 py-16 md:px-10 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-20">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.1em] text-[#aebdff]">
            Built for public attention
          </p>
          <h2 className="mt-5 max-w-2xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl">
            Browse what matters. Keep the source close.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#c7ccd5]">
            Every published card is free to read, link, and download. No account
            is required.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3 lg:justify-end">
          <a
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#111827] hover:bg-[#dbe3ff]"
            href="/workspace"
          >
            Browse Brief <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

export function BriefHeroCopy() {
  return (
    <div className="flex max-w-3xl flex-col justify-center">
      <p className="ib-reveal font-mono text-[0.65rem] font-medium uppercase tracking-[0.1em] text-[#3e5ae8]">
        Global policy intelligence
      </p>
      <h1 className="ib-reveal ib-reveal-delay-1 mt-6 text-balance text-[3.4rem] font-semibold leading-[0.93] tracking-[-0.07em] text-[#111827] sm:text-[4.7rem] lg:text-[5.7rem]">
        Know the change.
        <br />
        <span className="text-[#3e5ae8]">Make the call.</span>
      </h1>
      <p className="ib-reveal ib-reveal-delay-2 mt-7 max-w-xl text-lg leading-7 text-[#68707d]">
        A practical global view of policy movement, built around source context
        instead of noise.
      </p>
      <div className="ib-reveal ib-reveal-delay-3 mt-8 flex flex-wrap gap-3">
        <a
          className="ib-lift inline-flex items-center gap-2 rounded-lg bg-[#3e5ae8] px-5 py-3 text-sm font-semibold text-white hover:bg-[#2e48c8]"
          href="/workspace"
        >
          Explore Brief <ArrowRight className="h-4 w-4" />
        </a>
        <a
          className="inline-flex items-center px-4 py-3 text-sm font-semibold text-[#4f5967] hover:text-[#111827]"
          href="#method"
        >
          See how it works
        </a>
      </div>
    </div>
  );
}
