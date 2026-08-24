import BrandMark from "@/components/BrandMark";
import {
  AccessInvitation,
  BriefHeroCopy,
  BriefNavigation,
  ReferenceHeroPreview,
  OpenSourceDocs,
  WorkflowSection,
} from "@/components/landing/BriefLandingSections";

export default function Home() {
  return (
    <div className="min-h-screen overflow-clip bg-[#07080b] text-white">
      <header className="relative z-10 bg-[#07080b]">
        <div className="mx-auto flex h-[66px] w-full max-w-[1200px] items-center justify-between px-6 md:px-10 lg:px-14">
          <a href="#top" aria-label="Brief home">
            <BrandMark compact tone="light" />
          </a>
          <BriefNavigation />
        </div>
      </header>

      <main id="top" className="relative z-10">
        <section className="w-full px-[10px] pb-20 pt-[70px] md:pb-28 md:pt-[70px] lg:pt-[70px]">
          <BriefHeroCopy />
          <div className="brief-reference-trust mx-auto mt-14 flex max-w-[720px] flex-wrap items-center justify-center gap-x-10 gap-y-5 text-white/45 sm:mt-16">
            <span className="text-lg font-semibold tracking-[-0.05em]">
              EUROPEAN UNION
            </span>
            <span className="text-base font-semibold tracking-[-0.06em]">
              UK
            </span>
            <span className="text-base font-semibold tracking-[-0.04em]">
              INDIA
            </span>
            <span className="text-base font-semibold tracking-[-0.06em]">
              SINGAPORE
            </span>
            <span className="text-base font-semibold tracking-[-0.04em]">
              USA
            </span>
            <span className="hidden text-base font-semibold tracking-[-0.05em] sm:inline">
              GLOBAL
            </span>
          </div>
          <ReferenceHeroPreview />
        </section>

        <WorkflowSection />

        <OpenSourceDocs />
        <AccessInvitation />
      </main>

      <footer className="relative z-10 mx-auto flex w-full max-w-[1240px] flex-col gap-3 px-6 py-9 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between md:px-10 lg:px-14">
        <span>Brief — global policy intelligence</span>
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-white/35">
          Public discovery · source-linked
        </span>
      </footer>
    </div>
  );
}
