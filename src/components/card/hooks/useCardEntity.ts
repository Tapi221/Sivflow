import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useCards } from "./useCards";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { getLocalDb } from "@/services/localdb";
import type { Card } from "@/types";



const DRAFT_KEY_PREFIX = "card-editor-draft-";



const makeDraftKey = (cardId: string) => `${DRAFT_KEY_PREFIX}${cardId}`;
const toRecord = (value: unknown): Record<string, unknown> | null => {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
};
const resolveStableBlockId = ({
  side,
  cardId,
  block,
  index,
}: {
  side: "q" | "a";
  cardId: string;
  block: unknown;
  index: number;
}) => {
  const record = toRecord(block);
  const explicitId =
    typeof record?.id === "string" && record.id.trim().length > 0
      ? record.id.trim()
      : null;

  if (explicitId) {
    return explicitId;
  }

  const blockType =
    typeof record?.type === "string" && record.type.trim().length > 0
      ? record.type.trim()
      : "block";

  return `${side}-${cardId}-${blockType}-${index}`;
};
const withStableBlockIds = (raw: unknown) => {
  const record = toRecord(raw);

  if (!record) {
    return raw;
  }

  const resolvedCardId =
    typeof record.id === "string" && record.id.trim().length > 0
      ? record.id
      : typeof record.cardId === "string" && record.cardId.trim().length > 0
        ? record.cardId
        : "card";

  const assignIds = (blocks: unknown, side: "q" | "a") =>
    (Array.isArray(blocks) ? blocks : []).map((block, index) => {
      const blockRecord = toRecord(block);

      if (!blockRecord) {
        return block;
      }

      return {
        ...blockRecord,
        id: resolveStableBlockId({
          side,
          cardId: resolvedCardId,
          block: blockRecord,
          index,
        }),
      };
    });

  const front = toRecord(record.front) ?? {};
  const back = toRecord(record.back) ?? {};

  return {
    ...record,
    front: {
      ...front,
      blocks: assignIds(
        front.blocks ?? record.questionBlocks ?? record.question_blocks,
        "q",
      ),
    },
    back: {
      ...back,
      blocks: assignIds(
        back.blocks ?? record.answerBlocks ?? record.answer_blocks,
        "a",
      ),
    },
  };
};
const normalizeCardWithStableBlockIds = (value: unknown) => {
  return normalizeCard(withStableBlockIds(value));
};
const readCardDraft = (cardId: string) => {
  if (typeof window === "undefined") return null;

  const key = makeDraftKey(cardId);
  const raw = window.localStorage.getItem(key);

  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const useCardEntity = (cardId?: string | null) => {
  const { currentUser } = useAuthSession();
  const { updateCard } = useCards(undefined, undefined, { enabled: false });

  const serverCard = useLiveQuery(
    async (): Promise<Card | null> => {
      if (!cardId || !currentUser?.uid) return null;

      const db = await getLocalDb(currentUser.uid);
      const row = await db.cards.get(cardId);

      return row ? normalizeCard(row) : null;
    },
    [currentUser?.uid, cardId],
    null,
  );

  const normalizedServerCard = useMemo(() => {
    if (!serverCard) {
      return null;
    }

    return normalizeCardWithStableBlockIds(serverCard);
  }, [serverCard]);

  const draftCard = useMemo(() => {
    if (!cardId) return null;

    const draft = readCardDraft(cardId);

    if (!draft) return null;

    return normalizeCardWithStableBlockIds({
      ...(normalizedServerCard ?? {}),
      ...draft,
      id: cardId,
    });
  }, [cardId, normalizedServerCard]);

  const effectiveCard = useMemo(() => {
    if (draftCard) return draftCard;
    return normalizedServerCard;
  }, [draftCard, normalizedServerCard]);

  const hasDirtyDraft = Boolean(cardId && draftCard);

  const saveDraft = useCallback(async () => {
    if (!cardId || !draftCard) return;

    const { id, ...patch } = draftCard;
    await updateCard(id, patch);
    window.localStorage.removeItem(makeDraftKey(cardId));
  }, [cardId, draftCard, updateCard]);

  const flushDraft = useCallback(async () => {
    await saveDraft();
  }, [saveDraft]);

  return {
    serverCard: normalizedServerCard,
    draftCard,
    effectiveCard,
    hasDirtyDraft,
    saveDraft,
    flushDraft,
  };
};



export { useCardEntity };
