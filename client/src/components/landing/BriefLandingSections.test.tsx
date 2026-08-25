import { Fingerprint, LockKeyhole, Radar } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AccessInvitation,
  BriefHeroCopy,
  BriefNavigation,
  PrincipleCards,
  ReferenceHeroPreview,
  SignalBoard,
  WorkflowSteps,
} from "./BriefLandingSections";

describe("BriefLandingSections", () => {
  it("renders the original navigation, signal, workflow, principles, and invitation elements", () => {
    const html = renderToStaticMarkup(
      <>
        <BriefNavigation />
        <BriefHeroCopy />
        <ReferenceHeroPreview />
        <SignalBoard />
        <WorkflowSteps
          steps={[
            ["Explore first", "Start with a clear public view."],
            ["Verify", "Keep evidence attached."],
            ["Decide", "Move with context."],
          ]}
        />
        <PrincipleCards
          principles={[
            { icon: Radar, title: "Signal", description: "Clarified." },
            { icon: Fingerprint, title: "Traceable", description: "Attached." },
            { icon: LockKeyhole, title: "Private", description: "Scoped." },
          ]}
        />
        <AccessInvitation />
      </>
    );

    expect(html).toContain("Explore");
    expect(html).toContain("Global discovery");
    expect(html).toContain("May");
    expect(html).toContain("2026");
    expect(html).toContain("Explore first");
    expect(html).toContain("Browse what matters. Keep the source close.");
  });
});
