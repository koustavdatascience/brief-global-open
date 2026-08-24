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
