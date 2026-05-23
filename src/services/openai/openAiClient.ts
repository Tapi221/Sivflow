import {
  DEFAULT_OPEN_AI_SETTINGS,
  loadOpenAiSettings,
  type OpenAiSettings,
} from "./openAiSettings";

export type GenerateTextOptions = {
  prompt: string;
  systemPrompt?: string;
  settings?: OpenAiSettings;
};

export type GenerateTextResult = {
  text: string;
  model: string;
};

type ResponseOutputText = {
  type: "output_text";
  text: string;
};

type ResponseMessage = {
  type: "message";
  content?: ResponseOutputText[];
};

type OpenAiResponsesApiResponse = {
  output_text?: string;
  output?: ResponseMessage[];
};

const OPEN_AI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";

const extractText = (response: OpenAiResponsesApiResponse): string => {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item): item is ResponseOutputText => item.type === "output_text")
      .map((item) => item.text)
      .join("\n") ?? ""
  );
};

export const generateTextWithOpenAi = async ({
  prompt,
  systemPrompt,
  settings = loadOpenAiSettings(),
}: GenerateTextOptions): Promise<GenerateTextResult> => {
  const apiKey = settings.apiKey.trim();

  if (!apiKey) {
    throw new Error("OpenAI APIキーが設定されていません。");
  }

  const model = settings.model.trim() || DEFAULT_OPEN_AI_SETTINGS.model;
  const input = systemPrompt
    ? [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ]
    : prompt;

  const response = await fetch(OPEN_AI_RESPONSES_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input,
      max_output_tokens: settings.maxOutputTokens,
    }),
  });

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof json.error === "object" &&
      json.error !== null &&
      "message" in json.error &&
      typeof json.error.message === "string"
        ? json.error.message
        : `OpenAI API request failed: ${response.status}`;

    throw new Error(message);
  }

  const text = extractText(json as OpenAiResponsesApiResponse).trim();

  if (!text) {
    throw new Error("OpenAI APIからテキスト応答を取得できませんでした。");
  }

  return { text, model };
};

export const testOpenAiConnection = async (settings = loadOpenAiSettings()) => {
  return generateTextWithOpenAi({
    prompt: "Reply with exactly: OK",
    settings: {
      ...settings,
      maxOutputTokens: Math.min(settings.maxOutputTokens, 16),
    },
  });
};
