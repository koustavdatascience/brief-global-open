import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Discover from "./Discover";

vi.stubGlobal("fetch", vi.fn());

describe("Discover", () => {
  it("renders the public feed shell without workspace or account context", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/discover", vi.fn()]}>
        <Discover />
      </Router>
    );
    expect(html).toContain("Global discovery");
    expect(html).toContain(
      "Read, search, and download published cards without an account."
    );
    expect(html).toContain("Loading the public signal feed…");
    expect(html).toContain("Download briefing");
    expect(html).not.toContain("Sign in to download");
    expect(html).not.toContain("workspace_id");
  });

  it("shows the open export action without an account context", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/discover", vi.fn()]}>
        <Discover />
      </Router>
    );
    expect(html).toContain("Download briefing");
    expect(html).not.toContain("Sign in to download");
  });
});
