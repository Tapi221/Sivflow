import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";



type CardSetViewFlippedFaceScope = {
  deviceScope: string;
  cardSetId: string | null | undefined;
};



const normalizeDeviceScope = (value: string | null | undefined) => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : "unknown";
};
const buildCardSetViewFlippedFaceScopeKey = ({ deviceScope, cardSetId }: CardSetViewFlippedFaceScope) => {
  return [SHARED_STORAGE_KEYS.cardSetViewFlippedFacePrefix, normalizeDeviceScope(deviceScope), cardSetId ?? "__no_card_set__"].join("::");
};
const readLocalValue = (key: string) => {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeLocalValue = (key: string, value: string | null) => {
  if (typeof window === "undefined") return;

  try {
    if ((value === null || value === undefined)) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    return;
  }
};
const normalizeCardIdList = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );
};
const getCardSetViewFlippedCardIds = ({ deviceScope, cardSetId }: CardSetViewFlippedFaceScope) => {
  if (!cardSetId) return new Set<string>();

  const currentStorageKey = buildCardSetViewFlippedFaceScopeKey({
    deviceScope,
    cardSetId,
  });
  const raw = readLocalValue(currentStorageKey);
  if (!raw) return new Set<string>();

  try {
    return new Set<string>(normalizeCardIdList(JSON.parse(raw)));
  } catch {
    return new Set<string>();
  }
};
const setCardSetViewFlippedCardIds = ({ deviceScope, cardSetId, ids }: CardSetViewFlippedFaceScope & { ids: ReadonlySet<string>;
}) => {
  if (!cardSetId) return;

  const normalizedIds = Array.from(ids).filter(
    (entry): entry is string =>
      typeof entry === "string" && entry.trim().length > 0,
  );

  writeLocalValue(
    buildCardSetViewFlippedFaceScopeKey({ deviceScope, cardSetId }),
    normalizedIds.length > 0 ? JSON.stringify(normalizedIds) : null,
  );
};



export { buildCardSetViewFlippedFaceScopeKey, getCardSetViewFlippedCardIds, setCardSetViewFlippedCardIds };
