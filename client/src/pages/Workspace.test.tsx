import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Workspace, {
  hasCompactMarkdownArtifact,
  normalizePdfText,
  pdfLines,
} from "./Workspace";

vi.stubGlobal("fetch", vi.fn());

describe("Workspace", () => {
  it("renders the public scheduled-cycle workspace shell", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/workspace", vi.fn()]}>
        <Workspace />
      </Router>
    );
    expect(html).toContain("Brief workspace");
    expect(html).toContain("Sundays + Wednesdays + Fridays");
    expect(html).toContain("09:00 IST");
    expect(html).toContain("Loading the latest public cycle…");
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("service_role");
  });

  it("keeps topics in a compact menu instead of a second inline filter row", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/workspace", vi.fn()]}>
        <Workspace />
      </Router>
    );
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain(">Topics<");
    expect(html).not.toContain("All topics");
  });

  it("normalizes character-spaced PDF labels without changing normal prose", () => {
    expect(
      normalizePdfText(
        "W h a t c h a n g e d: 2 0 2 6, B I S removed two addresses"
      )
    ).toBe("What changed: 2026, BIS removed two addresses");
    expect(normalizePdfText("The U.S. Bureau of Industry and Security")).toBe(
      "The U.S. Bureau of Industry and Security"
    );
  });

  it("keeps the official source out of the body so it can be rendered once as a link", () => {
    expect(
      pdfLines(
        "# What changed\nA concise update.\n# Official source\n1. [Read the source](https://example.gov/item)"
      )
    ).toEqual([
      { kind: "heading", text: "What changed" },
      { kind: "body", text: "A concise update." },
    ]);
  });

  it("detects compact PRDs that should use the clean PDF fallback", () => {
    expect(
      hasCompactMarkdownArtifact(
        "# What changed  ## The Department of Education removed the duplicate publication step.  ## Practical MVP  1. **Template & formatting engine** – Draft notices in a guided editor."
      )
    ).toBe(true);
    expect(
      hasCompactMarkdownArtifact(
        "## What changed\nThe Department of Education removed the duplicate publication step.\n## Practical MVP\n- Template and formatting engine"
      )
    ).toBe(false);
  });

  it("preserves modern detailed PRD headings as styled sections", () => {
    expect(
      pdfLines(
        "## Users and operating model\nOwners and reviewers.\n## System boundary and architecture\nSource and evidence services.\n## Core workflow and state\nCapture, review, approve.\n## Data model and evidence lineage\nVersioned records.\n## Integrations and interfaces\nControlled adapters.\n## Security, compliance, and controls\nLeast privilege.\n## Observability and operations\nEvents and retries.\n## Deployment topology\nManaged web app.\n## MVP vertical slice\nOne end-to-end workflow.\n## Scale and evolution\nQueue-backed ingestion."
      )
    ).toEqual([
      { kind: "heading", text: "Users and operating model" },
      { kind: "body", text: "Owners and reviewers." },
      { kind: "heading", text: "System boundary and architecture" },
      { kind: "body", text: "Source and evidence services." },
      { kind: "heading", text: "Core workflow and state" },
      { kind: "body", text: "Capture, review, approve." },
      { kind: "heading", text: "Data model and evidence lineage" },
      { kind: "body", text: "Versioned records." },
      { kind: "heading", text: "Integrations and interfaces" },
      { kind: "body", text: "Controlled adapters." },
      { kind: "heading", text: "Security, compliance, and controls" },
      { kind: "body", text: "Least privilege." },
      { kind: "heading", text: "Observability and operations" },
      { kind: "body", text: "Events and retries." },
      { kind: "heading", text: "Deployment topology" },
      { kind: "body", text: "Managed web app." },
      { kind: "heading", text: "MVP vertical slice" },
      { kind: "body", text: "One end-to-end workflow." },
      { kind: "heading", text: "Scale and evolution" },
      { kind: "body", text: "Queue-backed ingestion." },
    ]);
  });

  it("splits compact model Markdown into readable PDF sections and bullets", () => {
    expect(
      pdfLines(
        "# What changed  ## The Department of Education removed the duplicate publication step.  ## Practical MVP  1. **Template & formatting engine** – Draft notices in a guided editor.  2. **Automated submission** – Post through Grants.gov.  ## Users and workflow  *Agencies / Grant Managers* – Draft notice → submit → track status.  ## Sources  - [Official record](https://example.gov/item)"
      )
    ).toEqual([
      { kind: "heading", text: "What changed" },
      {
        kind: "body",
        text: "The Department of Education removed the duplicate publication step.",
      },
      { kind: "heading", text: "Practical MVP" },
      {
        kind: "bullet",
        text: "Template & formatting engine: Draft notices in a guided editor.",
      },
      {
        kind: "bullet",
        text: "Automated submission: Post through Grants.gov.",
      },
      { kind: "heading", text: "Users and workflow" },
      {
        kind: "bullet",
        text: "Agencies / Grant Managers: Draft notice → submit → track status.",
      },
    ]);
  });
});
