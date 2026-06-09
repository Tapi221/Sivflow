export type GenerateOllamaAnswerInput = {
  question: string;
  model?: string;
};

export type GenerateOllamaAnswerResult = {
  answer: string;
  model: string;
};

const DEFAULT_OLLAMA_MODEL = "llama3.2:3b";
const OLLAMA_GENERATE_ENDPOINT = "http://localhost:11434/api/generate";
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

const parseOllamaGenerateResponse = (value: unknown): string => {
  if (!isRecord(value)) return "";

  return getString(value.response)?.trim() ?? "";
};

const createAbortSignal = (): { signal: AbortSignal; cancel: () => void } => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), OLLAMA_REQUEST_TIMEOUT_MS);

  return {
    signal: controller.signal,
    cancel: () => window.clearTimeout(timeoutId),
  };
};

const generateOllamaAnswerWithBrowserFetch = async (model: string, prompt: string): Promise<string> => {
  const abort = createAbortSignal();

  try {
    const response = await fetch(OLLAMA_GENERATE_ENDPOINT, {
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

export const generateOllamaAnswer = async ({ question, model = DEFAULT_OLLAMA_MODEL }: GenerateOllamaAnswerInput): Promise<GenerateOllamaAnswerResult> => {
  const normalizedQuestion = normalizeQuestion(question);
  if (!normalizedQuestion) throw new Error("QUESTION_REQUIRED");

  const prompt = buildQaPrompt(normalizedQuestion);
  const answer = window.desktop?.ai ? parseOllamaGenerateResponse(await window.desktop.ai.generateOllama({ model, prompt })) : await generateOllamaAnswerWithBrowserFetch(model, prompt);
  if (!answer) throw new Error("OLLAMA_EMPTY_RESPONSE");

  return { answer, model };
};