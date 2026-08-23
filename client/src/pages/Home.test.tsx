import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./Home";

describe("Home", () => {
  it("renders the global browse-first intelligence proposition", () => {
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain("Know the change.");
    expect(html).toContain("Make the call.");
    expect(html).toContain("Global policy intelligence");
    expect(html).toContain("Less to scan");
    expect(html).toContain("Evidence stays close");
    expect(html).toContain("Browse what matters. Keep the source close.");
    expect(html).toContain("No account is required.");
    expect(html).not.toContain("Free to use");
    expect(html).not.toContain("Open by default");
  });
});
