import { getLocalAiSettings } from "./localAiSettings";



type GenerateOllamaAnswerInput = {
  question: string;
  model?: string;
};
type GenerateOllamaAnswerResult = {
  answer: string;
  model: string;
};
type TestOllamaConnectionResult = {
  ok: boolean;
  modelAvailable: boolean;
  model: string;
  baseUrl: string;
  models: string[];
};



const OLLAMA_REQUEST_TIMEOUT_MS = 60_000;



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const getString = (value: unknown): string | null => typeof value === "string" ? value : null;
const buildQaPrompt = (question: string): string => {
  return [
    "あなたは学習カード作成を補助するAIです。",
    "ユーザーの疑問に対して、カードの回答欄に入れやすい短い日本語で答えてください。",
    "条件:",
    "- 断定しすぎず、必要なら前提も書く",
    "- 箇条書きは必要最小限",
    "- 長すぎる説明にしない",
    "- 最後に余計な挨拶を入れない",
    "",
    `疑問: ${question}`,
  ].join("\n");
};
const normalizeQuestion = (value: string): string => value.trim().slice(0, 1000);
const normalizeBaseUrl = (value: string): string => value.trim().replace(/\/+$/, "");
const buildOllamaApiUrl = (baseUrl: string, path: string): string => `${normalizeBaseUrl(baseUrl)}${path}`;
const parseOllamaGenerateResponse = (value: unknown): string => {
  if (!isRecord(value)) return "";

  return getString(value.response)?.trim() ?? "";
};
const parseOllamaTagsResponse = (value: unknown): string[] => {
  if (!isRecord(value) || !Array.isArray(value.models)) return [];

  return value.models.map((model) => isRecord(model) ? getString(model.name) : null).filter((name): name is string => Boolean(name));
};
const createAbortSignal = (): { signal: AbortSignal; cancel: () => void; } => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), OLLAMA_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timeoutId),
  };
};
const generateOllamaAnswerWithBrowserFetch = async (baseUrl: string, model: string, prompt: string): Promise<string> => {
  const abort = createAbortSignal();

  try {
    const response = await fetch(buildOllamaApiUrl(baseUrl, "/api/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
      signal: abort.signal,
    });

    if (!response.ok) {
      throw new Error(`OLLAMA_HTTP_${response.status}`);
    }

    const data: unknown = await response.json();
    return parseOllamaGenerateResponse(data);
  } finally {
    abort.cancel();
  }
};
const listOllamaModelsWithBrowserFetch = async (baseUrl: string): Promise<string[]> => {
  const abort = createAbortSignal();

  try {
    const response = await fetch(buildOllamaApiUrl(baseUrl, "/api/tags"), {
      method: "GET",
      signal: abort.signal,
    });

    if (!response.ok) {
      throw new Error(`OLLAMA_TAGS_HTTP_${response.status}`);
    }

    const data: unknown = await response.json();
    return parseOllamaTagsResponse(data);
  } finally {
    abort.cancel();
  }
};
const generateOllamaAnswer = async ({ question, model }: GenerateOllamaAnswerInput): Promise<GenerateOllamaAnswerResult> => {
  const settings = getLocalAiSettings();
  if (!settings.enabled) throw new Error("LOCAL_AI_DISABLED");

  const normalizedQuestion = normalizeQuestion(question);
  if (!normalizedQuestion) throw new Error("QUESTION_REQUIRED");

  const selectedModel = model?.trim() || settings.model;
  const prompt = buildQaPrompt(normalizedQuestion);
  const answer = window.desktop?.ai ? parseOllamaGenerateResponse(await window.desktop.ai.generateOllama({ baseUrl: settings.baseUrl, model: selectedModel, prompt })) : await generateOllamaAnswerWithBrowserFetch(settings.baseUrl, selectedModel, prompt);
  if (!answer) throw new Error("OLLAMA_EMPTY_RESPONSE");

  return { answer, model: selectedModel };
};
const testOllamaConnection = async (): Promise<TestOllamaConnectionResult> => {
  const settings = getLocalAiSettings();
  const models = window.desktop?.ai ? await window.desktop.ai.listOllamaModels({ baseUrl: settings.baseUrl }) : await listOllamaModelsWithBrowserFetch(settings.baseUrl);

  return {
    ok: true,
    modelAvailable: models.includes(settings.model),
    model: settings.model,
    baseUrl: settings.baseUrl,
    models,
  };
};



export { generateOllamaAnswer, testOllamaConnection };


export type { GenerateOllamaAnswerInput, GenerateOllamaAnswerResult, TestOllamaConnectionResult };
