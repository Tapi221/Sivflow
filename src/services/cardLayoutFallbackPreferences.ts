import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";
import type { SplitFallbackCardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE, normalizeSplitFallbackCardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";



interface SplitFallbackPreferencesStore {
  version: 1;
  byDeviceScope: Record<string, SplitFallbackCardLayoutMode>;
}



const emptyStore = (): SplitFallbackPreferencesStore => ({
  version: 1,
  byDeviceScope: {},
});
const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};
const parseStore = (raw: string | null) => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as Partial<SplitFallbackPreferencesStore> | null;
    if (
      parsed &&
      parsed.version === 1 &&
      parsed.byDeviceScope &&
      typeof parsed.byDeviceScope === "object"
    ) {
      return parsed as SplitFallbackPreferencesStore;
    }
  } catch {
    return null;
  }

  return null;
};
const readStore = () => {
  if (typeof window === "undefined") {
    return emptyStore();
  }

  try {
    return (
      parseStore(
        window.localStorage.getItem(
          SHARED_STORAGE_KEYS.cardLayoutSplitFallback,
        ),
      ) ?? emptyStore()
    );
  } catch {
    return emptyStore();
  }
};
const writeStore = (store: SplitFallbackPreferencesStore) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      SHARED_STORAGE_KEYS.cardLayoutSplitFallback,
      JSON.stringify(store),
    );
  } catch {
    // ローカル保存の失敗は無視します。
  }
};
const resolveSplitFallbackLayoutModePreference = (deviceScope: string, fallbackMode: SplitFallbackCardLayoutMode = DEFAULT_SPLIT_FALLBACK_CARD_LAYOUT_MODE) => {
  const store = readStore();
  const stored = store.byDeviceScope[normalizeDeviceScope(deviceScope)];
  return stored ? normalizeSplitFallbackCardLayoutMode(stored) : fallbackMode;
};
const setSplitFallbackLayoutModePreference = (deviceScope: string, mode: SplitFallbackCardLayoutMode) => {
  const store = readStore();
  store.byDeviceScope[normalizeDeviceScope(deviceScope)] =
    normalizeSplitFallbackCardLayoutMode(mode);
  writeStore(store);
};



export { resolveSplitFallbackLayoutModePreference, setSplitFallbackLayoutModePreference };
