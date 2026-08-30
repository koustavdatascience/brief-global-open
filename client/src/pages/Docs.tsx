import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  Bug,
  Check,
  ChevronDown,
  Github,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link } from "wouter";
import BrandMark from "@/components/BrandMark";
import BlurredStagger from "@/components/BlurredStagger";
import EditorialLabel from "@/components/EditorialLabel";

const githubUrl = "https://github.com/koustavdatascience/brief-global-open";
const issuesUrl = `${githubUrl}/issues`;
const contactEmail = "koustavdatascience@gmail.com";

const cycleSteps = [
  {
    number: "01",
    title: "Find the signal",
    description:
      "Brief reviews bounded, approved sources and publishes selected policy movement with the jurisdiction, type, date, importance, and official source kept together.",
  },
  {
    number: "02",
    title: "Understand the context",
    description:
      "Read the plain-language summary first. The source link remains the authority, while the status wording distinguishes proposals, milestones, guidance, and enacted changes.",
  },
  {
    number: "03",
    title: "Explore the opportunity",
    description:
      "Where a defensible product opportunity exists, Brief adds a grounded idea and a detailed implementation brief. Weak or purely administrative opportunities are left without an idea.",
  },
];

const principles = [
  [
    "Source-linked by default",
    "Every published change keeps an official source close to the explanation.",
  ],
  [
    "Public and account-free",
    "The workspace is designed for shared discovery without sign-in or a private operator surface.",
  ],
  [
    "Facts and proposals separated",
    "Verified policy facts, implementation milestones, and product proposals are labeled distinctly.",
  ],
  [
    "Inspectable and open",
    "The application, documentation, and deployment shape are available in the public repository.",
  ],
] as const;

const frequentlyAsked = [
  {
    question: "What is Brief?",
    answer:
      "Brief is an account-free public workspace that turns selected, source-linked policy movement into clear context for people following policy, software, and markets together.",
  },
  {
    question: "When does the workspace refresh?",
    answer:
      "The scheduled workspace is intended to refresh every Sunday, Wednesday, and Friday at 09:00 IST in the Asia/Kolkata timezone. A scheduled run may start later if the automation provider queues it.",
  },
  {
    question: "Are Brief’s summaries the official policy record?",
    answer:
      "No. Brief provides a concise orientation layer. The linked official publication is the authority, and readers should open it before making legal, operational, tax, investment, or compliance decisions.",
  },
  {
    question: "Why do some policy changes have no project idea?",
    answer:
      "Brief only proposes an idea when the policy creates a defensible, specific opportunity for a serious system. Weak, purely administrative, or insufficiently grounded opportunities are intentionally left without an idea.",
  },
  {
    question: "How can I report an incorrect source or technical issue?",
    answer:
      "Use the Report an issue link above for a broken page, source concern, unclear explanation, or reproducible technical problem. Include the affected URL, source, and steps to reproduce when possible.",
  },
  {
    question: "How should I report a security vulnerability?",
    answer:
      "Do not publish credentials, personal data, raw private policy material, or sensitive exploit details in a public issue. Follow the private reporting guidance in the repository security policy or contact the owner privately.",
  },
] as const;

export default function Docs() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="min-h-screen bg-[var(--brief-paper)] text-[var(--brief-ink)]">
      <header className="mx-auto flex w-full items-center justify-between gap-5 px-6 py-5 sm:px-10 lg:px-16 xl:px-20">
        <Link href="/" aria-label="Brief home">
          <BrandMark />
        </Link>
        <nav className="flex items-center gap-3 text-xs font-semibold text-[var(--brief-muted)] sm:gap-5">
          <Link
            className="transition hover:text-[var(--brief-ink)]"
            href="/workspace"
          >
            Workspace
          </Link>
          <a
            className="hidden transition hover:text-[var(--brief-ink)] sm:inline"
            href={githubUrl}
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </header>

      <section className="mx-auto w-full px-6 pb-16 pt-12 sm:px-10 sm:pb-20 lg:px-16 lg:pt-20 xl:px-20">
        <div className="max-w-4xl">
          <EditorialLabel>Brief documentation</EditorialLabel>
          <h1 className="mt-5 max-w-4xl font-display text-5xl leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-[5.5rem]">
            <BlurredStagger as="span" delay={80} stagger={18}>
              {"A clear way to follow policy change."}
            </BlurredStagger>
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-7 text-[var(--brief-muted)] sm:text-lg">
            Brief is an account-free, source-linked public workspace for global
            policy intelligence. This guide explains what it publishes, how to
            read it, and how to help improve it.
          </p>
        </div>
      </section>

      <section className="border-y border-[var(--brief-rule)] bg-[var(--brief-surface)]">
        <div className="mx-auto grid w-full max-w-[1240px] gap-10 px-6 py-16 sm:px-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:px-16 lg:py-24 xl:px-20">
          <div>
            <EditorialLabel>Start here</EditorialLabel>
            <h2 className="mt-4 max-w-2xl font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Policy movement, organized for a useful next question.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--brief-muted)]">
              The public workspace is not a replacement for the official record.
              It is a compact orientation layer: what changed, where it applies,
              how important it appears, and which source should be read next.
            </p>
          </div>
          <aside className="rounded-2xl border border-[var(--brief-rule)] bg-white p-5">
            <BookOpen className="h-5 w-5 text-[var(--brief-accent)]" />
            <p className="mt-5 text-sm font-semibold">
              Read with the source open
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--brief-muted)]">
              Brief summaries provide context. The linked official publication
              remains the authority for decisions.
            </p>
          </aside>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 lg:px-16 lg:py-24 xl:px-20">
        <div className="max-w-2xl">
          <EditorialLabel>How it works</EditorialLabel>
          <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
            From source to decision context.
          </h2>
        </div>
        <div className="mt-12 grid gap-0 border-t border-[var(--brief-rule)] md:grid-cols-3">
          {cycleSteps.map(step => (
            <article
              className="border-b border-[var(--brief-rule)] py-7 md:border-b-0 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
              key={step.number}
            >
              <span className="font-mono text-[0.65rem] tracking-[0.14em] text-[var(--brief-accent)]">
                {step.number}
              </span>
              <h3 className="mt-6 text-xl font-semibold tracking-[-0.035em]">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--brief-muted)]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--brief-rule)] bg-[#111c20] text-white">
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-16 lg:py-24 xl:px-20">
          <div>
            <EditorialLabel>Principles</EditorialLabel>
            <h2 className="mt-4 max-w-md font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Useful because the boundaries are visible.
            </h2>
          </div>
          <div className="grid gap-0 sm:grid-cols-2">
            {principles.map(([title, description]) => (
              <div
                className="border-t border-white/15 py-5 sm:px-5 sm:odd:pl-0"
                key={title}
              >
                <div className="flex items-start gap-3">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#c47758]" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/90">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-white/55">
                      {description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 lg:px-16 lg:py-24 xl:px-20">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <EditorialLabel>Open source and safety</EditorialLabel>
            <h2 className="mt-4 max-w-md font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Inspect the stack. Keep sensitive details private.
            </h2>
          </div>
          <div className="space-y-6 text-sm leading-7 text-[var(--brief-muted)]">
            <p>
              Brief is published under the Apache License 2.0. The public
              application exposes curated workspace data only; service-role
              credentials, provider keys, raw private source material, and
              editorial operations stay outside the browser surface.
            </p>
            <p>
              AI-generated candidates are validated and remain private until an
              explicit publication path exists. A policy summary is an aid to
              discovery, not legal, tax, investment, or compliance advice.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <a
                className="inline-flex items-center gap-2 rounded-full bg-[var(--brief-ink)] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[var(--brief-accent)]"
                href={githubUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Github className="h-3.5 w-3.5" /> View repository
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <Link
                className="inline-flex items-center gap-2 rounded-full border border-[var(--brief-rule)] px-4 py-2.5 text-xs font-semibold transition hover:border-[var(--brief-ink)]"
                href="/workspace"
              >
                Open Workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--brief-rule)] bg-[var(--brief-surface)]">
        <div className="mx-auto w-full max-w-[1240px] px-6 py-16 sm:px-10 lg:px-16 lg:py-24 xl:px-20">
          <div className="mb-10 max-w-2xl">
            <EditorialLabel>Contact and feedback</EditorialLabel>
            <h2 className="mt-4 font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Help keep the public record useful.
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--brief-muted)]">
              Found an incorrect source, broken link, unclear explanation, or
              technical problem? Choose the channel that fits the issue.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <a
              className="group rounded-2xl border border-[var(--brief-rule)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brief-ink)]"
              href={issuesUrl}
              rel="noreferrer"
              target="_blank"
            >
              <Bug className="h-5 w-5 text-[var(--brief-accent)]" />
              <div className="mt-10 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">
                    Report an issue
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--brief-muted)]">
                    Share a broken page, source concern, or reproducible product
                    issue on GitHub.
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--brief-muted)] transition group-hover:text-[var(--brief-ink)]" />
              </div>
            </a>

            <a
              className="group rounded-2xl border border-[var(--brief-rule)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brief-ink)]"
              href={`mailto:${contactEmail}`}
            >
              <Mail className="h-5 w-5 text-[var(--brief-accent)]" />
              <div className="mt-10">
                <h3 className="text-lg font-semibold tracking-[-0.03em]">
                  Contact Koustav
                </h3>
                <p className="mt-2 break-all text-sm leading-6 text-[var(--brief-muted)]">
                  {contactEmail}
                </p>
              </div>
            </a>

            <a
              className="group rounded-2xl border border-[var(--brief-rule)] bg-white p-6 transition hover:-translate-y-0.5 hover:border-[var(--brief-ink)]"
              href={`${githubUrl}/blob/main/.github/SECURITY.md`}
            >
              <ShieldCheck className="h-5 w-5 text-[var(--brief-accent)]" />
              <div className="mt-10 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold tracking-[-0.03em]">
                    Security concerns
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--brief-muted)]">
                    Do not post credentials, personal data, or sensitive exploit
                    details in a public issue.
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--brief-muted)] transition group-hover:text-[var(--brief-ink)]" />
              </div>
            </a>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-[var(--brief-rule)] pt-6 text-xs text-[var(--brief-muted)] sm:flex-row sm:items-center sm:justify-between">
            <span>Brief global policy intelligence</span>
            <span>Built by Koustav</span>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--brief-rule)] bg-[var(--brief-paper)]">
        <div className="mx-auto grid w-full max-w-[1240px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-16 lg:py-24 xl:px-20">
          <div>
            <EditorialLabel>FAQ</EditorialLabel>
            <h2 className="mt-4 max-w-md font-display text-3xl font-medium leading-tight tracking-[-0.045em] sm:text-4xl">
              Common questions, answered plainly.
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--brief-muted)]">
              If your question is not covered here, send feedback through the
              contact options above.
            </p>
          </div>

          <div className="border-t border-[var(--brief-rule)]">
            {frequentlyAsked.map((item, index) => {
              const isOpen = openFaq === index;
              const answerId = `faq-answer-${index}`;
              return (
                <div
                  className="border-b border-[var(--brief-rule)]"
                  key={item.question}
                >
                  <button
                    aria-controls={answerId}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-sm font-semibold tracking-[-0.015em] transition hover:text-[var(--brief-accent)]"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    type="button"
                  >
                    <span>{item.question}</span>
                    <ChevronDown
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 text-[var(--brief-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    id={answerId}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <p className="max-w-2xl pb-5 pr-10 text-sm leading-6 text-[var(--brief-muted)]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
