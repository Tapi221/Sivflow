import type { InkDocument, InkSide } from "@core/domain/card/ink/inkDocument";
import { cloneInkDocument, createEmptyInkDocument, normalizeInkDocument } from "@core/domain/card/ink/inkDocument";



const INK_STORAGE_PREFIX = "ink:";



const getStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};
const getInkStorageKey = (cardId: string, side: InkSide): string => `${INK_STORAGE_PREFIX}${cardId}:${side}`;
const loadInkFromStorage = (cardId: string | null | undefined, side: InkSide, fallback?: InkDocument | null): InkDocument => {
  const normalizedFallback = normalizeInkDocument(fallback ?? createEmptyInkDocument());
  if (!cardId) return normalizedFallback;

  const storage = getStorage();
  if (!storage) return normalizedFallback;

  try {
    const raw = storage.getItem(getInkStorageKey(cardId, side));
    if (!raw) return normalizedFallback;
    const parsed = JSON.parse(raw);
    return normalizeInkDocument(parsed);
  } catch {
    return normalizedFallback;
  }
};
const saveInkToStorage = (cardId: string | null | undefined, side: InkSide, document: InkDocument): void => {
  if (!cardId) return;
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(
      getInkStorageKey(cardId, side),
      JSON.stringify(normalizeInkDocument(document)),
    );
  } catch {
    // Ignore storage quota errors to avoid blocking input.
  }
};
const clearInkFromStorage = (cardId: string | null | undefined, side: InkSide): void => {
  if (!cardId) return;
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(getInkStorageKey(cardId, side));
  } catch {
    // ignore
  }
};
const resolveInkDocument = (cardId: string | null | undefined, side: InkSide, cardDocument?: InkDocument | null): InkDocument => {
  const normalizedCardDocument = normalizeInkDocument(cardDocument ?? createEmptyInkDocument());
  const storageDocument = loadInkFromStorage(cardId, side, null);

  let resolved = normalizedCardDocument;
  if (storageDocument) {
    resolved =
      storageDocument.updatedAt > normalizedCardDocument.updatedAt
        ? storageDocument
        : normalizedCardDocument;
  }

  return cloneInkDocument(resolved);
};



export { getInkStorageKey, loadInkFromStorage, saveInkToStorage, clearInkFromStorage, resolveInkDocument };
