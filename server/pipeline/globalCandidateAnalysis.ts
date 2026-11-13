import {
  buildExtractionPrompt,
  parseStructuredExtraction,
  POLICY_SIGNAL_JSON_SCHEMA,
  type ExtractionResult,
  type TrustedExtractionContext,
} from "./extractionContract";
import {
  DEFAULT_FREE_OPENROUTER_MODEL,
  openRouterModelChain,
  supportsJsonObjectResponseFormat,
} from "../ai/openRouterModels";

export const GEMINI_PRIMARY_MODEL_ID = "gemini-2.5-flash-lite";
export const OPENROUTER_FALLBACK_MODEL_ID = DEFAULT_FREE_OPENROUTER_MODEL;
export const GROQ_FALLBACK_MODEL_ID = "llama-3.3-70b-versatile";

const PROVIDER_TIMEOUT_MS = 20_000;
const PROVIDER_SYSTEM_INSTRUCTION =
  "You are a source-grounded policy candidate analysis service. Return only JSON conforming to the supplied schema. Do not browse, call tools, discover sources, make publication decisions, or infer facts absent from the supplied source text.";

export type DirectProviderConfiguration = {
  geminiApiKey?: string;
  geminiModel: string;
  openRouterApiKey?: string;
  openRouterModel: string;
  openRouterModels?: string[];
  groqApiKey?: string;
  groqModel: string;
};

export type GlobalCandidateAnalysisResult = {
  modelId?: string;
  outcome:
    | ExtractionResult
    | { status: "failed"; reason: "provider_error" | "source_too_large" };
};

export type GlobalCandidateAnalysisDependencies = {
  fetch?: typeof fetch;
  providerConfiguration?: () => DirectProviderConfiguration;
};

type ProviderAttempt =
  | { status: "output"; modelId: string; text: string }
  | { status: "provider_failure"; modelId?: string; httpStatus?: number }
  | { status: "unavailable"; modelId?: string };

function logProviderFailure(
  provider: string,
  attempt: Extract<ProviderAttempt, { status: "provider_failure" }>
) {
  console.warn("[brief] policy AI provider failure", {
    provider,
    modelId: attempt.modelId,
    httpStatus: attempt.httpStatus,
  });
}

function logRejectedOutput(modelId: string | undefined, reason: string) {
  console.warn("[brief] policy AI output rejected", { modelId, reason });
}

function configuredModel(value: string | undefined, fallback: string): string {
  return value?.trim() || fallback;
}

type ModelCatalog = {
  data?: Array<{ id?: string }>;
};

let discoveredConfiguration: Promise<DirectProviderConfiguration> | undefined;
const providerCooldowns = new Set<"gemini" | "openrouter" | "groq">();

function shouldSkipProvider(provider: "gemini" | "openrouter" | "groq") {
  return providerCooldowns.has(provider);
}

function maybeCooldownProvider(
  provider: "gemini" | "openrouter" | "groq",
  attempt: ProviderAttempt
) {
  if (
    attempt.status === "provider_failure" &&
    (attempt.httpStatus === 401 ||
      attempt.httpStatus === 403 ||
      attempt.httpStatus === 429)
  )
    providerCooldowns.add(provider);
}

async function readCatalog(
  request: typeof fetch,
  url: string,
  headers: Record<string, string>
): Promise<ModelCatalog | null> {
  try {
    const response = await request(url, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as ModelCatalog;
    return payload && Array.isArray(payload.data) ? payload : null;
  } catch {
    return null;
  }
}

async function discoverProviderConfiguration(
  request: typeof fetch,
  base: DirectProviderConfiguration
): Promise<DirectProviderConfiguration> {
  const next = { ...base };
  if (base.geminiApiKey) {
    try {
      const response = await request(
        "https://generativelanguage.googleapis.com/v1beta/models",
        {
          headers: { "x-goog-api-key": base.geminiApiKey },
          signal: AbortSignal.timeout(8_000),
        }
      );
      if (response.ok) {
        const payload = (await response.json()) as {
          models?: Array<{
            name?: string;
            supportedGenerationMethods?: string[];
          }>;
        };
        const models = (payload.models ?? [])
          .filter(model =>
            model.supportedGenerationMethods?.includes("generateContent")
          )
          .map(model => model.name?.replace(/^models\//, ""))
          .filter((model): model is string => Boolean(model));
        if (models.length && !models.includes(base.geminiModel)) {
          next.geminiModel =
            [
              "gemini-2.5-flash",
              "gemini-2.0-flash",
              "gemini-2.5-flash-lite",
            ].find(model => models.includes(model)) ?? models[0];
        }
        console.info("[brief] Gemini model catalog selected", {
          configured: base.geminiModel,
          selected: next.geminiModel,
          availableCount: models.length,
        });
      }
    } catch {
      console.warn(
        "[brief] Gemini model catalog unavailable; using configured model"
      );
    }
  }
  if (base.openRouterApiKey) {
    const catalog = await readCatalog(
      request,
      "https://openrouter.ai/api/v1/models",
      { Authorization: `Bearer ${base.openRouterApiKey}` }
    );
    if (catalog) {
      const ids = (catalog.data ?? [])
        .map(model => model.id)
        .filter((model): model is string => Boolean(model));
      const free = ids.filter(model => model.endsWith(":free"));
      const available = free.length ? free : ids;
      if (available.length && !available.includes(base.openRouterModel))
        next.openRouterModel = available[0];
      next.openRouterModels = available.slice(0, 12);
      console.info("[brief] OpenRouter model catalog selected", {
        configured: base.openRouterModel,
        selected: next.openRouterModel,
        availableCount: available.length,
      });
    }
  }
  if (base.groqApiKey) {
    const catalog = await readCatalog(
      request,
      "https://api.groq.com/openai/v1/models",
      { Authorization: `Bearer ${base.groqApiKey}` }
    );
    if (catalog) {
      const ids = (catalog.data ?? [])
        .map(model => model.id)
        .filter((model): model is string => Boolean(model));
      if (ids.length && !ids.includes(base.groqModel)) {
        next.groqModel =
          ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"].find(model =>
            ids.includes(model)
          ) ?? ids[0];
      }
      console.info("[brief] Groq model catalog selected", {
        configured: base.groqModel,
        selected: next.groqModel,
        availableCount: ids.length,
      });
    }
  }
  return next;
}

async function runtimeProviderConfiguration(
  request: typeof fetch
): Promise<DirectProviderConfiguration> {
  if (!discoveredConfiguration) {
    const base = readDirectProviderConfiguration();
    discoveredConfiguration = discoverProviderConfiguration(
      request,
      base
    ).catch(() => base);
  }
  return discoveredConfiguration;
}

export function readDirectProviderConfiguration(
  input: NodeJS.ProcessEnv = process.env
): DirectProviderConfiguration {
  return {
    geminiApiKey: input.GEMINI_API_KEY,
    geminiModel: configuredModel(input.GEMINI_MODEL, GEMINI_PRIMARY_MODEL_ID),
    openRouterApiKey: input.OPENROUTER_API_KEY,
    openRouterModel: configuredModel(
      input.OPENROUTER_MODEL,
      OPENROUTER_FALLBACK_MODEL_ID
    ),
    groqApiKey: input.GROQ_API_KEY,
    groqModel: configuredModel(input.GROQ_MODEL, GROQ_FALLBACK_MODEL_ID),
  };
}

function geminiResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const candidate = (
    payload as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }>;
    }
  ).candidates?.[0];
  return (candidate?.content?.parts ?? [])
    .map(part => (typeof part.text === "string" ? part.text : ""))
    .join("\n");
}

function chatResponseText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const content = (
    payload as { choices?: Array<{ message?: { content?: unknown } }> }
  ).choices?.[0]?.message?.content;
  return typeof content === "string" ? content : "";
}

function chatRequest(model: string, prompt: string) {
  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    temperature: 0.1,
    stream: false,
    messages: [
      { role: "system", content: PROVIDER_SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
  };
  if (supportsJsonObjectResponseFormat(model))
    body.response_format = { type: "json_object" };
  return body;
}

function bearerRequest(
  body: Record<string, unknown>,
  apiKey: string
): RequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify(body),
  };
}

async function analyzeWithGemini(
  prompt: string,
  configuration: DirectProviderConfiguration,
  request: typeof fetch
): Promise<ProviderAttempt> {
  if (!configuration.geminiApiKey)
    return { status: "unavailable", modelId: configuration.geminiModel };
  try {
    const response = await request(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuration.geminiModel)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": configuration.geminiApiKey,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: PROVIDER_SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseJsonSchema: POLICY_SIGNAL_JSON_SCHEMA,
          },
        }),
      }
    );
    if (!response.ok) {
      const attempt = {
        status: "provider_failure" as const,
        modelId: configuration.geminiModel,
        httpStatus: response.status,
      };
      logProviderFailure("gemini", attempt);
      return attempt;
    }
    return {
      status: "output",
      modelId: configuration.geminiModel,
      text: geminiResponseText(await response.json()),
    };
  } catch {
    const attempt = {
      status: "provider_failure" as const,
      modelId: configuration.geminiModel,
    };
    logProviderFailure("gemini", attempt);
    return attempt;
  }
}

async function analyzeWithOpenRouter(
  prompt: string,
  configuration: DirectProviderConfiguration,
  request: typeof fetch,
  model: string
): Promise<ProviderAttempt> {
  if (!configuration.openRouterApiKey)
    return { status: "unavailable", modelId: model };
  try {
    const response = await request(
      "https://openrouter.ai/api/v1/chat/completions",
      bearerRequest(chatRequest(model, prompt), configuration.openRouterApiKey)
    );
    if (!response.ok) {
      const attempt = {
        status: "provider_failure" as const,
        modelId: model,
        httpStatus: response.status,
      };
      logProviderFailure("openrouter", attempt);
      return attempt;
    }
    return {
      status: "output",
      modelId: model,
      text: chatResponseText(await response.json()),
    };
  } catch {
    const attempt = {
      status: "provider_failure" as const,
      modelId: model,
    };
    logProviderFailure("openrouter", attempt);
    return attempt;
  }
}

async function analyzeWithGroq(
  prompt: string,
  configuration: DirectProviderConfiguration,
  request: typeof fetch
): Promise<ProviderAttempt> {
  if (!configuration.groqApiKey)
    return { status: "unavailable", modelId: configuration.groqModel };
  try {
    const response = await request(
      "https://api.groq.com/openai/v1/chat/completions",
      bearerRequest(
        chatRequest(configuration.groqModel, prompt),
        configuration.groqApiKey
      )
    );
    if (!response.ok) {
      const attempt = {
        status: "provider_failure" as const,
        modelId: configuration.groqModel,
        httpStatus: response.status,
      };
      logProviderFailure("groq", attempt);
      return attempt;
    }
    return {
      status: "output",
      modelId: configuration.groqModel,
      text: chatResponseText(await response.json()),
    };
  } catch {
    const attempt = {
      status: "provider_failure" as const,
      modelId: configuration.groqModel,
    };
    logProviderFailure("groq", attempt);
    return attempt;
  }
}

/**
 * This only accepts a size-bounded document from the executor. An output that
 * parses to an abstention, the next provider gets a chance. No result publishes
 * a public signal unless it passes the strict extraction contract.
 */
export async function analyzeGlobalCandidate(
  sourceText: string,
  context: TrustedExtractionContext,
  dependencies: GlobalCandidateAnalysisDependencies = {}
): Promise<GlobalCandidateAnalysisResult> {
  const normalizedText = sourceText.trim();
  if (!normalizedText)
    return { outcome: { status: "abstained", reason: "schema_mismatch" } };

  const request = dependencies.fetch ?? fetch;
  const configuration = dependencies.providerConfiguration
    ? dependencies.providerConfiguration()
    : await runtimeProviderConfiguration(request);
  const prompt = buildExtractionPrompt(normalizedText, context);
  let lastModelId: string | undefined;
  let lastAbstention:
    | Extract<GlobalCandidateAnalysisResult["outcome"], { status: "abstained" }>
    | undefined;

  const geminiResult = shouldSkipProvider("gemini")
    ? { status: "unavailable" as const, modelId: configuration.geminiModel }
    : await analyzeWithGemini(prompt, configuration, request);
  maybeCooldownProvider("gemini", geminiResult);
  lastModelId = geminiResult.modelId ?? lastModelId;
  if (geminiResult.status === "output") {
    const outcome = parseStructuredExtraction(geminiResult.text);
    if (outcome.status === "accepted")
      return { modelId: geminiResult.modelId, outcome };
    logRejectedOutput(geminiResult.modelId, outcome.reason);
    lastAbstention = outcome;
  }

  for (const model of openRouterModelChain(
    configuration.openRouterModel,
    configuration.openRouterModels
  )) {
    if (shouldSkipProvider("openrouter")) break;
    const openRouterResult = await analyzeWithOpenRouter(
      prompt,
      configuration,
      request,
      model
    );
    maybeCooldownProvider("openrouter", openRouterResult);
    lastModelId = openRouterResult.modelId ?? lastModelId;
    if (openRouterResult.status === "output") {
      const outcome = parseStructuredExtraction(openRouterResult.text);
      if (outcome.status === "accepted")
        return { modelId: openRouterResult.modelId, outcome };
      logRejectedOutput(openRouterResult.modelId, outcome.reason);
      lastAbstention = outcome;
    }
  }

  const groqResult = shouldSkipProvider("groq")
    ? { status: "unavailable" as const, modelId: configuration.groqModel }
    : await analyzeWithGroq(prompt, configuration, request);
  maybeCooldownProvider("groq", groqResult);
  lastModelId = groqResult.modelId ?? lastModelId;
  if (groqResult.status === "output") {
    const outcome = parseStructuredExtraction(groqResult.text);
    if (outcome.status === "accepted")
      return { modelId: groqResult.modelId, outcome };
    logRejectedOutput(groqResult.modelId, outcome.reason);
    lastAbstention = outcome;
  }

  if (lastAbstention) return { modelId: lastModelId, outcome: lastAbstention };

  return {
    modelId: lastModelId,
    outcome: { status: "failed", reason: "provider_error" },
  };
}
