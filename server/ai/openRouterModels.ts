export const DEFAULT_FREE_OPENROUTER_MODEL =
  "nvidia/nemotron-3.5-super-vl:free";

export const FREE_OPENROUTER_FALLBACK_MODELS = [
  DEFAULT_FREE_OPENROUTER_MODEL,
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3.5-lightning:free",
] as const;

export function openRouterModelChain(primary: string, available?: string[]) {
  return Array.from(
    new Set([primary, ...(available ?? []), ...FREE_OPENROUTER_FALLBACK_MODELS])
  );
}

export function supportsJsonObjectResponseFormat(model: string) {
  return [
    "nvidia/nemotron-3.5-super-vl:free",
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
  ].includes(model);
}
