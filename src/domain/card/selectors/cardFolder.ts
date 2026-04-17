import type { CardSet } from "@/types";

type CardLike = {
  id?: string;
  cardSetId?: string | null;
  folderId?: string | null;
};
type CardSetLike = Pick<CardSet, "id" | "folderId">;
type LegacyFallbackReason = "missing-card-set-id" | "unresolved-card-set-id";

const legacyFallbackCounters = new Map<LegacyFallbackReason, number>();
const warnedFallbackCardKeys = new Set<string>();

const normalizeFolderId = (folderId: string | null | undefined) => {
  if (typeof folderId !== "string") return null;
  const trimmed = folderId.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const recordLegacyFallbackUsage = (
  card: CardLike,
  reason: LegacyFallbackReason,
) => {
  legacyFallbackCounters.set(
    reason,
    (legacyFallbackCounters.get(reason) ?? 0) + 1,
  );

  if (!import.meta.env.DEV) return;

  const cardKey =
    typeof card.id === "string" && card.id.trim().length > 0
      ? card.id
      : `anonymous:${reason}:${legacyFallbackCounters.get(reason)}`;
  if (warnedFallbackCardKeys.has(cardKey)) return;
  warnedFallbackCardKeys.add(cardKey);

  console.warn("[cardFolder] legacy card.folderId fallback used", {
    cardId: card.id ?? null,
    cardSetId: card.cardSetId ?? null,
    fallbackReason: reason,
  });
};

export const buildCardSetById = (cardSets: readonly CardSetLike[]) => {
  const map = new Map<string, CardSetLike>();
  for (const cardSet of cardSets) {
    if (!cardSet?.id) continue;
    map.set(cardSet.id, cardSet);
  }
  return map;
};

export const resolveCardFolderIdStrict = (
  card: CardLike,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId : "";
  if (!cardSetId) return null;
  const cardSet = cardSetById.get(cardSetId);
  if (!cardSet) return null;
  return normalizeFolderId(cardSet.folderId);
};

export const didUseLegacyFolderFallback = (
  card: CardLike,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const cardSetId = typeof card.cardSetId === "string" ? card.cardSetId : "";
  if (!cardSetId) return normalizeFolderId(card.folderId) !== null;
  return (
    !cardSetById.has(cardSetId) && normalizeFolderId(card.folderId) !== null
  );
};

export const resolveCardFolderId = (
  card: CardLike,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const strictFolderId = resolveCardFolderIdStrict(card, cardSetById);
  if (strictFolderId !== null) {
    return strictFolderId;
  }

  // Legacy fallback: only for backward-compat data with unresolved CardSet linkage.
  const legacyFolderId = normalizeFolderId(card.folderId);
  if (legacyFolderId === null) return null;

  const reason: LegacyFallbackReason =
    typeof card.cardSetId === "string" && card.cardSetId.trim().length > 0
      ? "unresolved-card-set-id"
      : "missing-card-set-id";
  recordLegacyFallbackUsage(card, reason);
  return legacyFolderId;
};

export const getLegacyFolderFallbackUsage = () => ({
  total:
    (legacyFallbackCounters.get("missing-card-set-id") ?? 0) +
    (legacyFallbackCounters.get("unresolved-card-set-id") ?? 0),
  missingCardSetId: legacyFallbackCounters.get("missing-card-set-id") ?? 0,
  unresolvedCardSetId:
    legacyFallbackCounters.get("unresolved-card-set-id") ?? 0,
});

export const resetLegacyFolderFallbackUsage = () => {
  legacyFallbackCounters.clear();
  warnedFallbackCardKeys.clear();
};

export const isCardInFolder = (
  card: CardLike,
  folderId: string | null | undefined,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const targetFolderId = normalizeFolderId(folderId);
  return resolveCardFolderId(card, cardSetById) === targetFolderId;
};

export const filterCardsByFolderId = <T extends CardLike>(
  cards: readonly T[],
  folderId: string | null | undefined,
  cardSetById: ReadonlyMap<string, CardSetLike>,
) => {
  const targetFolderId = normalizeFolderId(folderId);
  return cards.filter(
    (card) => resolveCardFolderId(card, cardSetById) === targetFolderId,
  );
};
