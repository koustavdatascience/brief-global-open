import React from "react";
import { Fingerprint, Radar } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import EditorialSectionHeader from "@/components/EditorialSectionHeader";
import {
  AccessInvitation,
  BriefHeroCopy,
  BriefNavigation,
  PrincipleCards,
  SignalBoard,
  WorkflowSteps,
} from "@/components/landing/BriefLandingSections";

const principles = [
  {
    icon: Radar,
    title: "Less to scan",
    description: "A focused discovery layer before the deeper work begins.",
  },
  {
    icon: Fingerprint,
    title: "Evidence stays close",
    description:
      "Every material claim is designed to retain its source context.",
  },
] as const;

const operatingModel = [
  ["Explore", "Start with a clear public global view."],
  ["Verify", "Follow the evidence when a signal matters."],
  ["Decide", "Use the source-linked context to decide what matters next."],
] as const;

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fff] text-[#111827]">
      <header className="border-b border-[#e6e8ed] bg-white">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between px-6 py-4 md:px-10 lg:px-14">
          <a href="#top" aria-label="Brief home">
            <BrandMark subtitle="Global policy intelligence" />
          </a>
          <BriefNavigation />
        </div>
      </header>
      <main id="top">
        <section className="mx-auto w-full max-w-[1180px] px-6 py-16 md:px-10 lg:px-14 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.08fr)_minmax(350px,0.92fr)] lg:gap-16">
            <BriefHeroCopy />
            <SignalBoard />
          </div>
          <WorkflowSteps steps={operatingModel} />
        </section>
        <section
          id="principles"
          className="border-y border-[#e6e8ed] bg-[#f6f7f9]"
        >
          <div className="mx-auto w-full max-w-[1180px] px-6 py-16 md:px-10 lg:px-14 lg:py-20">
            <EditorialSectionHeader
              eyebrow="Designed for practical attention"
              layout="split"
              title="Clarity, without the clutter."
            />
            <PrincipleCards principles={principles} />
          </div>
        </section>
        <AccessInvitation />
      </main>
      <footer className="mx-auto flex w-full max-w-[1180px] flex-col gap-2 px-6 py-8 text-sm text-[#7a8290] sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-14">
        <span>Brief — global policy intelligence</span>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em]">
          Public discovery · source-linked
        </span>
      </footer>
    </div>
  );
}
