import { readFile } from "node:fs/promises";

const workflowPath = new URL(
  "../.github/workflows/workspace-cycle.yml",
  import.meta.url
);
const workflow = await readFile(workflowPath, "utf8");

function requireText(fragment, explanation) {
  if (!workflow.includes(fragment)) {
    throw new Error(`Workspace cycle validation failed: ${explanation}`);
  }
}

requireText("workflow_dispatch:", "manual dispatch must remain available");
requireText("concurrency:", "non-overlapping cycle concurrency is required");
requireText(
  "BRIEF_WORKSPACE_CYCLE_ENABLED: ${{ vars.BRIEF_WORKSPACE_CYCLE_ENABLED }}",
  "the owner-controlled enable variable is required"
);
requireText(
  "The workspace cycle is disabled. No credentials or source requests will be used.",
  "the disabled path must be explicit and inert"
);
requireText(
  "if: steps.activation.outputs.enabled == 'true'",
  "worker steps must be guarded by the activation result"
);

const activationGate = workflow.indexOf("- name: Confirm owner activation");
const firstSecret = workflow.indexOf(
  "${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
);
const guardedRun = workflow.indexOf("- name: Run workspace cycle\n        if:");
if (
  activationGate < 0 ||
  firstSecret < activationGate ||
  guardedRun < activationGate
) {
  throw new Error(
    "Workspace cycle validation failed: the activation gate must precede guarded secret use."
  );
}

console.log("Workspace cycle activation-gate validation passed.");
