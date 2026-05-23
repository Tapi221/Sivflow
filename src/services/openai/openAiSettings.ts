export type OpenAiBillingMode = "user-api-key";

export type OpenAiSettings = {
  billingMode: OpenAiBillingMode;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
};

const STORAGE_KEY = "flashcard-master.openai.settings.v1";

export const DEFAULT_OPEN_AI_SETTINGS: OpenAiSettings = {
  billingMode: "user-api-key",
  apiKey: "",
  model: "gpt-5.4-mini",
  maxOutputTokens: 700,
};

const isOpenAiSettings = (value: unknown): value is OpenAiSettings => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<OpenAiSettings>;

  return (
    candidate.billingMode === "user-api-key" &&
    typeof candidate.apiKey === "string" &&
    typeof candidate.model === "string" &&
    Number.isFinite(candidate.maxOutputTokens)
  );
};

export const loadOpenAiSettings = (): OpenAiSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_OPEN_AI_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return DEFAULT_OPEN_AI_SETTINGS;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isOpenAiSettings(parsed)) {
      return DEFAULT_OPEN_AI_SETTINGS;
    }

    return {
      ...DEFAULT_OPEN_AI_SETTINGS,
      ...parsed,
      maxOutputTokens: Math.max(1, Math.floor(parsed.maxOutputTokens)),
    };
  } catch {
    return DEFAULT_OPEN_AI_SETTINGS;
  }
};

export const saveOpenAiSettings = (settings: OpenAiSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized: OpenAiSettings = {
    billingMode: "user-api-key",
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim() || DEFAULT_OPEN_AI_SETTINGS.model,
    maxOutputTokens: Math.max(1, Math.floor(settings.maxOutputTokens)),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
};

export const clearOpenAiSettings = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
};
