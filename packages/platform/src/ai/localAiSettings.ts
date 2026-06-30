type LocalAiProvider = "ollama";
type LocalAiSettings = {
  enabled: boolean;
  provider: LocalAiProvider;
  baseUrl: string;
  model: string;
};



const LOCAL_AI_SETTINGS_STORAGE_KEY = "sivflow.localAiSettings.v1";
const DEFAULT_LOCAL_AI_SETTINGS: LocalAiSettings = {
  enabled: true,
  provider: "ollama",
  baseUrl: "http://127.0.0.1:11434",
  model: "llama3.2:3b",
};



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const normalizeBaseUrl = (value: unknown): string => {
  if (typeof value !== "string") return DEFAULT_LOCAL_AI_SETTINGS.baseUrl;

  const trimmed = value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(trimmed)) return DEFAULT_LOCAL_AI_SETTINGS.baseUrl;

  return trimmed;
};
const normalizeModel = (value: unknown): string => {
  if (typeof value !== "string") return DEFAULT_LOCAL_AI_SETTINGS.model;

  const trimmed = value.trim();
  return trimmed || DEFAULT_LOCAL_AI_SETTINGS.model;
};
const parseLocalAiSettings = (value: unknown): LocalAiSettings => {
  if (!isRecord(value)) return DEFAULT_LOCAL_AI_SETTINGS;

  return {
    enabled: typeof value.enabled === "boolean" ? value.enabled : DEFAULT_LOCAL_AI_SETTINGS.enabled,
    provider: value.provider === "ollama" ? "ollama" : DEFAULT_LOCAL_AI_SETTINGS.provider,
    baseUrl: normalizeBaseUrl(value.baseUrl),
    model: normalizeModel(value.model),
  };
};
const getDefaultLocalAiSettings = (): LocalAiSettings => ({ ...DEFAULT_LOCAL_AI_SETTINGS });
const getLocalAiSettings = (): LocalAiSettings => {
  if (typeof window === "undefined") return getDefaultLocalAiSettings();

  try {
    const rawValue = window.localStorage.getItem(LOCAL_AI_SETTINGS_STORAGE_KEY);
    if (!rawValue) return getDefaultLocalAiSettings();

    return parseLocalAiSettings(JSON.parse(rawValue));
  } catch {
    return getDefaultLocalAiSettings();
  }
};
const setLocalAiSettings = (settings: LocalAiSettings): LocalAiSettings => {
  const nextSettings = parseLocalAiSettings(settings);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_AI_SETTINGS_STORAGE_KEY, JSON.stringify(nextSettings));
  }

  return nextSettings;
};



export { getDefaultLocalAiSettings, getLocalAiSettings, setLocalAiSettings };


export type { LocalAiProvider, LocalAiSettings };
