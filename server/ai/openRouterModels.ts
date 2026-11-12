export const DEFAULT_FREE_OPENROUTER_MODEL = "google/gemma-4-31b-it:free";

export const FREE_OPENROUTER_FALLBACK_MODELS = [
  DEFAULT_FREE_OPENROUTER_MODEL,
  "nvidia/nemotron-3.5-lightning:free",
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
] as const;

export function openRouterModelChain(primary: string) {
  return Array.from(new Set([primary, ...FREE_OPENROUTER_FALLBACK_MODELS]));
}

export function supportsJsonObjectResponseFormat(model: string) {
  return model === "google/gemma-4-31b-it:free";
}
