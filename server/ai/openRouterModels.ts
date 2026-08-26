export const DEFAULT_FREE_OPENROUTER_MODEL = "minimax/minimax-m3:free";

export const FREE_OPENROUTER_FALLBACK_MODELS = [
  DEFAULT_FREE_OPENROUTER_MODEL,
  "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
  "poolside/laguna-s-2.1:free",
] as const;

export function openRouterModelChain(primary: string) {
  return Array.from(new Set([primary, ...FREE_OPENROUTER_FALLBACK_MODELS]));
}

export function supportsJsonObjectResponseFormat(model: string) {
  return model === DEFAULT_FREE_OPENROUTER_MODEL;
}
