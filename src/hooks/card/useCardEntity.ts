import { useCallback, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useAuthSession } from "@/contexts/AuthContext";
import { useCards } from "@/hooks/card/useCards";
import { getLocalDb } from "@/services/localDB";
import type { Card } from "@/types";
import { normalizeCard } from "@/utils";

const DRAFT_KEY_PREFIX = "card-editor-draft-";

const makeDraftKey = (cardId: string) => `${DRAFT_KEY_PREFIX}${cardId}`;

const withStableBlockIds = (raw: unknown) => {
  if (!raw) return raw;

  const assignIds = (blocks: unknown[], side: "q" | "a") =>
    (Array.isArray(blocks) ? blocks : []).map(
      (block: unknown, index: number) => {
        if (typeof block?.id === "string" && block.id.trim()) return block;
        return {
          ...block,
          id: `${side}-${raw.id ?? raw.cardId ?? "card"}-${index}-${Date.now()}`,
        };
      },
    );

  return {
    ...raw,
    front: {
      ...((raw.front as Record<string, unknown> | undefined) ?? {}),
      blocks: assignIds(
        ((raw.front as { blocks?: unknown[] } | undefined)?.blocks ??
          raw.questionBlocks ??
          raw.question_blocks) as unknown[],
        "q",
      ),
    },
    back: {
      ...((raw.back as Record<string, unknown> | undefined) ?? {}),
      blocks: assignIds(
        ((raw.back as { blocks?: unknown[] } | undefined)?.blocks ??
          raw.answerBlocks ??
          raw.answer_blocks) as unknown[],
        "a",
      ),
    },
  };
};

function readCardDraft(cardId: string) {
  if (typeof window === "undefined") return null;
  const key = makeDraftKey(cardId);
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * useCardEntity の責務:
 * - serverCard と draftCard を同じ normalize 経路で統合する
 * - 画面描画用に draft 優先の effectiveCard を返す
 * - 画面遷移前に flushDraft() で未保存 draft を server へ確定させる
 */
export function useCardEntity(cardId?: string | null) {
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

  const draftCard = useMemo(() => {
    if (!cardId) return null;
    const draft = readCardDraft(cardId);
    if (!draft) return null;
    return normalizeCard(
      withStableBlockIds({ ...(serverCard ?? {}), ...draft, id: cardId }),
    );
  }, [cardId, serverCard]);

  const effectiveCard = useMemo(() => {
    if (draftCard) return draftCard;
    if (serverCard) return normalizeCard(withStableBlockIds(serverCard));
    return null;
  }, [draftCard, serverCard]);

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
    serverCard,
    draftCard,
    effectiveCard,
    hasDirtyDraft,
    saveDraft,
    flushDraft,
  };
}







