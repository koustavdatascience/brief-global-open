import { describe, expect, it } from "vitest";
import {
  WORKSPACE_TOPIC_VALUES,
  classifyWorkspaceTopics,
} from "./workspaceTopics";

describe("workspace topics", () => {
  it("exposes the complete eight-topic taxonomy", () => {
    expect(WORKSPACE_TOPIC_VALUES).toHaveLength(8);
    expect(WORKSPACE_TOPIC_VALUES).toContain("healthcare_life_sciences");
    expect(WORKSPACE_TOPIC_VALUES).toContain("corporate_business");
  });

  it("classifies source-backed policy text into no more than two topics", () => {
    expect(
      classifyWorkspaceTopics({
        headline: "DHS proposes an H-1B petition fee",
        summary:
          "The employer immigration proposal changes workforce planning cost.",
      })
    ).toEqual(["corporate_business", "labour_immigration"]);

    expect(
      classifyWorkspaceTopics({
        headline: "EU packaging and PFAS restrictions begin applying",
        summary: "Food-contact packaging and material evidence are affected.",
      })
    ).toEqual(["environment_materials"]);
  });
});
