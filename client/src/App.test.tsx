import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Router as WouterRouter } from "wouter";

vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./components/ErrorBoundary", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./contexts/ThemeContext", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

import App from "./App";

function renderPath(path: string) {
  return renderToStaticMarkup(
    <WouterRouter hook={() => [path, vi.fn()]}>
      <App />
    </WouterRouter>
  );
}

describe("public route surface", () => {
  it("renders the public workspace at /workspace", () => {
    expect(renderPath("/workspace")).toContain("Brief workspace");
  });

  it.each(["/access", "/account", "/operations", "/app/sources", "/discover"])(
    "does not expose a retired private or removed route at %s",
    path => {
      const html = renderPath(path);
      expect(html).toContain("Page Not Found");
      expect(html).not.toContain("Sign in");
      expect(html).not.toContain("Operations");
    }
  );
});
