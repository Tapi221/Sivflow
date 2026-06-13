type AiProviderMode = "local-template" | "openai-user-api-key";
type OpenAiSettings = {
  providerMode: AiProviderMode;
  apiKey: string;
  model: string;
  maxOutputTokens: number;
};

const STORAGE_KEY = "sivflow.openai.settings.v1";
const LEGACY_STORAGE_KEY = "flashcard-master.openai.settings.v1";
const DEFAULT_OPEN_AI_SETTINGS: OpenAiSettings = { providerMode: "local-template", apiKey: "", model: "gpt-5.4-mini", maxOutputTokens: 700 };

const isAiProviderMode = (value: unknown): value is AiProviderMode =>
  value === "local-template" || value === "openai-user-api-key";
const isOpenAiSettings = (value: unknown): value is OpenAiSettings => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Partial<OpenAiSettings> & { billingMode?: unknown; };
  const providerMode = candidate.providerMode ?? candidate.billingMode;

  return (
    isAiProviderMode(providerMode) &&
    typeof candidate.apiKey === "string" &&
    typeof candidate.model === "string" &&
    Number.isFinite(candidate.maxOutputTokens)
  );
};
const readStoredOpenAiSettings = (): string | null => {
  const current = window.localStorage.getItem(STORAGE_KEY);
  if (current) return current;

  const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) return null;

  window.localStorage.setItem(STORAGE_KEY, legacy);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  return legacy;
};
const loadOpenAiSettings = (): OpenAiSettings => {
  if (typeof window === "undefined") {
    return DEFAULT_OPEN_AI_SETTINGS;
  }

  try {
    const raw = readStoredOpenAiSettings();

    if (!raw) {
      return DEFAULT_OPEN_AI_SETTINGS;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isOpenAiSettings(parsed)) {
      return DEFAULT_OPEN_AI_SETTINGS;
    }

    const migrated = parsed as OpenAiSettings & { billingMode?: AiProviderMode; };

    return {
      ...DEFAULT_OPEN_AI_SETTINGS,
      ...migrated,
      providerMode: migrated.providerMode ?? migrated.billingMode ?? "local-template",
      maxOutputTokens: Math.max(1, Math.floor(migrated.maxOutputTokens)),
    };
  } catch {
    return DEFAULT_OPEN_AI_SETTINGS;
  }
};
const saveOpenAiSettings = (settings: OpenAiSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized: OpenAiSettings = {
    providerMode: settings.providerMode,
    apiKey: settings.apiKey.trim(),
    model: settings.model.trim() || DEFAULT_OPEN_AI_SETTINGS.model,
    maxOutputTokens: Math.max(1, Math.floor(settings.maxOutputTokens)),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
};
const clearOpenAiSettings = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_STORAGE_KEY);
};

export { DEFAULT_OPEN_AI_SETTINGS, loadOpenAiSettings, saveOpenAiSettings, clearOpenAiSettings };

export type { AiProviderMode, OpenAiSettings };
