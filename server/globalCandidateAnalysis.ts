import {
  buildExtractionPrompt,
  parseStructuredExtraction,
  POLICY_SIGNAL_JSON_SCHEMA,
  type ExtractionResult,
  type TrustedExtractionContext,
} from "./extractionContract";

export const GEMINI_PRIMARY_MODEL_ID = "gemini-2.5-flash";
export const OPENROUTER_FALLBACK_MODEL_ID = "openai/gpt-oss-20b";
export const GROQ_FALLBACK_MODEL_ID = "openai/gpt-oss-20b";

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
  | { status: "provider_failure"; modelId?: string }
  | { status: "unavailable"; modelId?: string };

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
  return {
    model,
    max_tokens: 4096,
    temperature: 0.1,
    stream: false,
    messages: [
      { role: "system", content: PROVIDER_SYSTEM_INSTRUCTION },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "policy_signal_candidate",
        strict: true,
        schema: POLICY_SIGNAL_JSON_SCHEMA,
      },
    },
  };
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
    if (!response.ok)
      return { status: "provider_failure", modelId: configuration.geminiModel };
    return {
      status: "output",
      modelId: configuration.geminiModel,
      text: geminiResponseText(await response.json()),
    };
  } catch {
    return { status: "provider_failure", modelId: configuration.geminiModel };
  }
}

async function analyzeWithOpenRouter(
  prompt: string,
  configuration: DirectProviderConfiguration,
  request: typeof fetch
): Promise<ProviderAttempt> {
  if (!configuration.openRouterApiKey)
    return { status: "unavailable", modelId: configuration.openRouterModel };
  try {
    const response = await request(
      "https://openrouter.ai/api/v1/chat/completions",
      bearerRequest(
        {
          ...chatRequest(configuration.openRouterModel, prompt),
          provider: { require_parameters: true },
        },
        configuration.openRouterApiKey
      )
    );
    if (!response.ok)
      return {
        status: "provider_failure",
        modelId: configuration.openRouterModel,
      };
    return {
      status: "output",
      modelId: configuration.openRouterModel,
      text: chatResponseText(await response.json()),
    };
  } catch {
    return {
      status: "provider_failure",
      modelId: configuration.openRouterModel,
    };
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
    if (!response.ok)
      return { status: "provider_failure", modelId: configuration.groqModel };
    return {
      status: "output",
      modelId: configuration.groqModel,
      text: chatResponseText(await response.json()),
    };
  } catch {
    return { status: "provider_failure", modelId: configuration.groqModel };
  }
}

/**
 * This only accepts a size-bounded document from the executor. An output that
 * parses to an abstention stops the chain; later providers are used exclusively
 * after a provider cannot supply an output. No result publishes a public signal.
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

  for (const attemptProvider of [
    analyzeWithGemini,
    analyzeWithOpenRouter,
    analyzeWithGroq,
  ]) {
    const result = await attemptProvider(prompt, configuration, request);
    lastModelId = result.modelId ?? lastModelId;
    if (result.status === "output")
      return {
        modelId: result.modelId,
        outcome: parseStructuredExtraction(result.text),
      };
  }

  return {
    modelId: lastModelId,
    outcome: { status: "failed", reason: "provider_error" },
  };
}
