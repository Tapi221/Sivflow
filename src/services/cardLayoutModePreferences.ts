import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";
import type { CardLayoutMode, CardSetInteractionMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { normalizeCardLayoutMode, resolveDefaultCardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import type { CardDisplayMode } from "@/types/domain/cardSet";



interface CardLayoutModePreferenceScope {
  deviceScope: string;
  cardSetId: string | null | undefined;
  displayMode: CardDisplayMode;
  interactionMode: CardSetInteractionMode;
}



const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};
const buildStorageKey = ({
  deviceScope,
  cardSetId,
  displayMode,
  interactionMode,
}: CardLayoutModePreferenceScope) => {
  return [
    SHARED_STORAGE_KEYS.cardLayoutModePrefix,
    normalizeDeviceScope(deviceScope),
    cardSetId ?? "__no_card_set__",
    displayMode,
    interactionMode,
  ].join(":");
};
const readStorageValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeStorageValue = (key: string, value: string) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ローカル保存に失敗しても、メモリ上の上書き経路は動き続けるため無視します。
  }
};
const getCardLayoutModePreference = (scope: CardLayoutModePreferenceScope): CardLayoutMode | null => {
  if (!scope.cardSetId) return null;

  const raw = readStorageValue(buildStorageKey(scope));
  return (raw === null || raw === undefined) ? null : normalizeCardLayoutMode(raw);
};
const resolveCardLayoutModePreference = (scope: CardLayoutModePreferenceScope, fallbackMode?: CardLayoutMode | null): CardLayoutMode => {
  const stored = getCardLayoutModePreference(scope);
  if (stored) return stored;

  if (fallbackMode) {
    return normalizeCardLayoutMode(fallbackMode);
  }

  return resolveDefaultCardLayoutMode(scope.interactionMode);
};
const setCardLayoutModePreference = (scope: CardLayoutModePreferenceScope, mode: CardLayoutMode) => {
  if (!scope.cardSetId) return;
  writeStorageValue(buildStorageKey(scope), normalizeCardLayoutMode(mode));
};



export { getCardLayoutModePreference, resolveCardLayoutModePreference, setCardLayoutModePreference };


export type { CardLayoutModePreferenceScope };
