import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import Workspace from "./Workspace";

vi.stubGlobal("fetch", vi.fn());

describe("Workspace", () => {
  it("renders the public scheduled-cycle workspace shell", () => {
    const html = renderToStaticMarkup(
      <Router hook={() => ["/workspace", vi.fn()]}>
        <Workspace />
      </Router>
    );
    expect(html).toContain("Brief workspace");
    expect(html).toContain("Sundays + Wednesdays");
    expect(html).toContain("09:00 IST");
    expect(html).toContain("Loading the latest public cycle…");
    expect(html).not.toContain("Sign in");
    expect(html).not.toContain("service_role");
  });
});
