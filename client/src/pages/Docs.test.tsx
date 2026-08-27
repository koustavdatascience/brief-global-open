import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Router } from "wouter";
import Docs from "./Docs";

describe("Docs", () => {
  it("renders the public documentation and contact surface", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/docs", () => undefined]}>
        <Docs />
      </Router>
    );

    expect(html).toContain("Brief documentation");
    expect(html).toContain("From source to decision context.");
    expect(html).toContain("Contact and feedback");
    expect(html).toContain("Report an issue");
    expect(html).toContain("koustavdatascience@gmail.com");
    expect(html).toContain(
      "https://github.com/koustavdatascience/brief-global-open/blob/main/.github/SECURITY.md"
    );
    expect(html).toContain("Common questions, answered plainly.");
    expect(html).toContain("What is Brief?");
    expect(html).toContain("When does the workspace refresh?");
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('aria-controls="faq-answer-0"');
  });
});
