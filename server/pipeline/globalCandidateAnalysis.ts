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
  const configuration = (
    dependencies.providerConfiguration ?? readDirectProviderConfiguration
  )();
  const prompt = buildExtractionPrompt(normalizedText, context);
  let lastModelId: string | undefined;
  let lastAbstention:
    | Extract<GlobalCandidateAnalysisResult["outcome"], { status: "abstained" }>
    | undefined;

  const geminiResult = await analyzeWithGemini(prompt, configuration, request);
  lastModelId = geminiResult.modelId ?? lastModelId;
  if (geminiResult.status === "output") {
    const outcome = parseStructuredExtraction(geminiResult.text);
    if (outcome.status === "accepted")
      return { modelId: geminiResult.modelId, outcome };
    logRejectedOutput(geminiResult.modelId, outcome.reason);
    lastAbstention = outcome;
  }

  for (const model of openRouterModelChain(configuration.openRouterModel)) {
    const openRouterResult = await analyzeWithOpenRouter(
      prompt,
      configuration,
      request,
      model
    );
    lastModelId = openRouterResult.modelId ?? lastModelId;
    if (openRouterResult.status === "output") {
      const outcome = parseStructuredExtraction(openRouterResult.text);
      if (outcome.status === "accepted")
        return { modelId: openRouterResult.modelId, outcome };
      logRejectedOutput(openRouterResult.modelId, outcome.reason);
      lastAbstention = outcome;
    }
  }

  const groqResult = await analyzeWithGroq(prompt, configuration, request);
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
