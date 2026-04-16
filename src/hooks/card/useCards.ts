import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  normalizeCardFolderId,
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";
import { getLocalDb } from "@/services/localDB";
import { useAuthSession } from "@/contexts/AuthContext";
import {
  useUserSettings,
  DEFAULT_SETTINGS,
} from "@/hooks/settings/useUserSettings";
import type { Card, CardPatch } from "@/types";
import {
  DEFAULT_LAYOUT_ROWS,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import {
  buildCardSetById,
  filterCardsByFolderId,
} from "@/domain/card/selectors/cardFolder";

const isCardDeleted = (
  card: Partial<Card> & {
    is_deleted?: boolean;
    deleted?: boolean;
    deletedAt?: unknown;
    deleted_at?: unknown;
  },
) => {
  const deletedAt = (card as unknown).deletedAt ?? (card as unknown).deleted_at;
  return Boolean(
    card.isDeleted ?? card.is_deleted ?? (card as unknown).deleted ?? deletedAt,
  );
};

type UseCardsOptions = {
  enabled?: boolean;
};

export const useCards = (
  folderId?: string,
  cardSetId?: string,
  options?: UseCardsOptions,
) => {
  const { currentUser } = useAuthSession();
  const [error] = useState<string | null>(null);
  const enabled = options?.enabled ?? true;

  // Use settings to determine init schedule
  const { settings } = useUserSettings();
  const normalizeFolderId = (value: string | null | undefined) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  // useLiveQueryでリアクティブにカードを取得
  const rawCards = useLiveQuery(
    async () => {
      try {
        if (!enabled) return [];
        if (!currentUser) return [];
        const db = await getLocalDb(currentUser.uid);

        if (cardSetId) {
          try {
            return await db.cards
              .where("cardSetId")
              .equals(cardSetId)
              .toArray();
          } catch (indexError) {
            console.warn(
              "[useCards] cardSetId index query failed. Falling back to full scan.",
              indexError,
            );
          }
        } else if (folderId) {
          try {
            const targetFolderId = normalizeFolderId(
              normalizeCardFolderId(folderId),
            );
            const siblingSets = (
              await db.cardSets
                .where("userId")
                .equals(currentUser.uid)
                .toArray()
            ).filter(
              (set) =>
                !set.isDeleted &&
                normalizeFolderId(set.folderId ?? null) === targetFolderId,
            );
            const siblingSetIds = siblingSets.map((set) => set.id);
            if (siblingSetIds.length === 0) return [];
            return await db.cards
              .where("cardSetId")
              .anyOf(siblingSetIds)
              .toArray();
          } catch (indexError) {
            console.warn(
              "[useCards] folder/cardSet index query failed. Falling back to full scan.",
              indexError,
            );
          }
        }

        return await db.getAllCards();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[useCards] Error: ${message}`);
        return [];
      }
    },

    [currentUser?.uid, folderId, cardSetId, enabled], // localDb.name is removed as dependency because it's now internal to liveQuery
  );

  const rawCardSets = useLiveQuery(
    async () => {
      if (!enabled) return [];
      if (!currentUser) return [];
      const db = await getLocalDb(currentUser.uid);
      return await db.cardSets
        .where("userId")
        .equals(currentUser.uid)
        .toArray();
    },
    [currentUser?.uid, enabled],
    [],
  );

  const cardSetById = useMemo(() => {
    const activeSets = (rawCardSets ?? []).filter((set) => !set.isDeleted);
    return buildCardSetById(activeSets);
  }, [rawCardSets]);

  // 正規化・フィルタ・ソートはuseMemoで処理
  const cards = useMemo(() => {
    if (!rawCards || rawCards.length === 0) return [];

    let normalized = rawCards.map(normalizeCard);

    // 削除済み（legacy is_deleted 含む）を除外
    normalized = normalized.filter(
      (c) => !isCardDeleted(c as Partial<Card> & { is_deleted?: boolean }),
    );

    // cardSetId でフィルタ（優先）
    if (cardSetId) {
      normalized = normalized.filter((c) => c.cardSetId === cardSetId);
    } else if (folderId) {
      normalized = filterCardsByFolderId(normalized, folderId, cardSetById);
    }

    // orderIndex でソート
    normalized.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return normalized;
  }, [rawCards, folderId, cardSetId, cardSetById]);

  // useLiveQueryはundefinedを返すことがあるのでloadingを判定
  const loading = enabled && rawCards === undefined;

  const createCard = async (
    cardData: Partial<Card> & { cardSetId?: string },
  ) => {
    if (!currentUser) throw new Error("認証が必要です");

    // 新規作成時はタイトルが空であることを許容する（あとで編集するため）
    // そのため、作成時のバリデーションはスキップする
    /*
    if (isCompletelyEmpty) {
      console.error('[useCards] Refusing to create completely empty card');
      throw new Error('カードの内容を入力してください。');
    }
    */

    const db = await getLocalDb(currentUser.uid);
    const effectiveSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    const startNextDay = effectiveSettings.reviewStartNextDay ?? true;

    const now = new Date();

    const toNullableFolderId = (value: string): string | null =>
      value.trim() === "" ? null : value;

    const resolveCardSetForCreate = async (): Promise<{
      cardSetId: string;
      folderId: string | null;
    }> => {
      const requestedCardSetId =
        typeof cardData.cardSetId === "string" ? cardData.cardSetId.trim() : "";
      if (requestedCardSetId) {
        const set = await db.cardSets.get(requestedCardSetId);
        if (set && !set.isDeleted) {
          return { cardSetId: set.id, folderId: set.folderId ?? null };
        }
      }

      const targetFolderId = normalizeCardFolderId(
        cardData.folderId ?? folderId ?? "",
      );
      const targetFolderOrNull = toNullableFolderId(targetFolderId);

      const siblingSets = (
        await db.cardSets.where("userId").equals(currentUser.uid).toArray()
      )
        .filter(
          (set) =>
            !set.isDeleted && (set.folderId ?? null) === targetFolderOrNull,
        )
        .sort((a, b) => {
          const orderA = a.orderIndex ?? 0;
          const orderB = b.orderIndex ?? 0;
          if (orderA !== orderB) return orderA - orderB;
          return (
            new Date(a.createdAt ?? 0).getTime() -
            new Date(b.createdAt ?? 0).getTime()
          );
        });

      const reusableSet = siblingSets[0];
      if (reusableSet) {
        return {
          cardSetId: reusableSet.id,
          folderId: reusableSet.folderId ?? null,
        };
      }

      const fallbackSetId = crypto.randomUUID();
      const fallbackSetName = "新規カードセット";
      const fallbackSetOrder =
        siblingSets.reduce(
          (max, set) => Math.max(max, set.orderIndex ?? 0),
          -1,
        ) + 1;

      await db.cardSets.add({
        id: fallbackSetId,
        userId: currentUser.uid,
        deviceId: cardData.deviceId || "web",
        folderId: targetFolderOrNull,
        name: fallbackSetName,
        orderIndex: fallbackSetOrder,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      return { cardSetId: fallbackSetId, folderId: targetFolderOrNull };
    };

    const resolvedCardSet = await resolveCardSetForCreate();
    const resolvedFolderId = resolvedCardSet.folderId ?? "";

    // orderIndex: 既存カードとの競合を避け、時間軸での並びを保証するタイムスタンプベース
    const orderIndex =
      cardData.orderIndex ??
      Date.now() * 10000 + Math.floor(Math.random() * 10000);

    // 表示用のQ番号は同一 CardSet の既存カード数+1とする
    const cardSetCardCount = await db.cards
      .where("cardSetId")
      .equals(resolvedCardSet.cardSetId)
      .count();
    const questionNumber =
      cardData.questionNumber ?? `Q${cardSetCardCount + 1}`;
    const id = crypto.randomUUID();

    const nextReviewDate = (() => {
      // If manually set, use it
      if (cardData.nextReviewDate) return cardData.nextReviewDate;

      const d = new Date(now);
      if (startNextDay) {
        d.setDate(d.getDate() + 1); // Schedule for tomorrow
      }
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const normalizedReviewLogs = Array.isArray(cardData.reviewLogs)
      ? [...cardData.reviewLogs].sort(
          (a, b) =>
            new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime(),
        )
      : [];

    const questionBlocks = resolveBlocksFromCardData(
      cardData as Partial<Card> & Record<string, unknown>,
      "question",
    );
    const answerBlocks = resolveBlocksFromCardData(
      cardData as Partial<Card> & Record<string, unknown>,
      "answer",
    );

    const newCard: Card = {
      id,
      userId: currentUser.uid,
      deviceId: cardData.deviceId || "web",
      cardSetId: resolvedCardSet.cardSetId,
      folderId: resolvedFolderId,
      orderIndex,
      questionNumber,
      title: cardData.title || "",
      isDraft: cardData.isDraft ?? false,
      // 新規作成時は必ず isDeleted: false で保存
      isDeleted: false,
      hasUncertainty: cardData.hasUncertainty ?? false,
      isBookmarked: cardData.isBookmarked ?? false,
      isCompleted: cardData.isCompleted ?? false,
      isSilent: cardData.isSilent ?? false,
      front: {
        blocks: questionBlocks,
        ink: resolveInkFromCardData(
          cardData as Partial<Card> & Record<string, unknown>,
          "question",
        ),
        extraRows: resolveExtraRowsFromCardData(
          cardData as Partial<Card> & Record<string, unknown>,
          "question",
        ),
      },
      back: {
        blocks: answerBlocks,
        ink: resolveInkFromCardData(
          cardData as Partial<Card> & Record<string, unknown>,
          "answer",
        ),
        extraRows: resolveExtraRowsFromCardData(
          cardData as Partial<Card> & Record<string, unknown>,
          "answer",
        ),
      },
      layoutRows: normalizeLayoutRows(
        (cardData as unknown).layoutRows ??
          (cardData as unknown).layout_rows ??
          DEFAULT_LAYOUT_ROWS,
      ),
      memoryStability: 0,
      currentLevel: cardData.currentLevel ?? null,
      nextReviewDate,
      createdAt: now,
      updatedAt: now,
      ...(Array.isArray(cardData.tagIds) ? { tagIds: cardData.tagIds } : {}),
      reviewLogs: normalizedReviewLogs,
    };

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.addItem("cards", newCard);
      return newCard;
    } catch (err) {
      console.error("[createCard] ERROR during LocalDB add", {
        table: "cards",
        cardId: newCard.id,
        error: err,
      });
      throw err;
    }
  };

  const updateCard = async (id: string, data: CardPatch) => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);

    // 更新後のカード状態をシミュレーション
    const fromCache = cards.find((c) => c.id === id) ?? null;
    const fromDb = fromCache ? null : await db.cards.get(id);
    const currentCard = fromCache ?? (fromDb ? normalizeCard(fromDb) : null);
    if (!currentCard) {
      console.warn("[updateCard] Card not found:", id);
      return;
    }

    const patch = { ...data } as Partial<Card> & Record<string, unknown>;
    const nextFront = {
      ...currentCard.front,
      ...((patch.front as Partial<Card["front"]> | undefined) ?? {}),
    };
    const nextBack = {
      ...currentCard.back,
      ...((patch.back as Partial<Card["back"]> | undefined) ?? {}),
    };

    if ("frontBlocks" in patch || "front" in patch) {
      nextFront.blocks = resolveBlocksFromCardData(patch, "question");
    }
    if ("backBlocks" in patch || "back" in patch) {
      nextBack.blocks = resolveBlocksFromCardData(patch, "answer");
    }
    if ("front" in patch) {
      nextFront.ink = resolveInkFromCardData(patch, "question");
    }
    if ("back" in patch) {
      nextBack.ink = resolveInkFromCardData(patch, "answer");
    }
    if ("front" in patch) {
      nextFront.extraRows = resolveExtraRowsFromCardData(patch, "question");
    }
    if ("back" in patch) {
      nextBack.extraRows = resolveExtraRowsFromCardData(patch, "answer");
    }

    patch.front = nextFront;
    patch.back = nextBack;
    delete patch.frontBlocks;
    delete patch.backBlocks;
    if (Array.isArray(patch.reviewLogs)) {
      patch.reviewLogs = [...patch.reviewLogs].sort(
        (a, b) =>
          new Date(a.reviewedAt).getTime() - new Date(b.reviewedAt).getTime(),
      );
    }
    // 通常の更新処理
    await db.updateItem("cards", id, {
      ...patch,
      updatedAt: new Date(),
    });
  };

  const deleteCard = async (id: string) => {
    if (!currentUser) throw new Error("認証が必要です");
    // ソフト削除: ACTIVE → TRASHED
    // isDeleted と deletedAt を同時に設定
    const db = await getLocalDb(currentUser.uid);
    await db.softDelete("cards", id);
  };

  const toggleFlag = async (
    id: string,
    flag: "hasUncertainty" | "isCompleted" | "isSilent" | "isBookmarked",
  ) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;

    await updateCard(id, { [flag]: !card[flag] });
  };

  /**
   * カードを別 CardSet へ移動
   */
  const moveCardToSet = async (cardId: string, targetCardSetId: string) => {
    if (!currentUser) throw new Error("認証が必要です");
    const db = await getLocalDb(currentUser.uid);

    const targetSet = await db.cardSets.get(targetCardSetId);
    if (!targetSet || targetSet.isDeleted) {
      throw new Error("移動先のカードセットが見つかりません");
    }

    const allCards = await db.getAllCards();
    const targetCards = allCards.filter(
      (card) =>
        card.cardSetId === targetCardSetId &&
        !isCardDeleted(card as Partial<Card> & { is_deleted?: boolean }),
    );

    const maxOrderIndex = targetCards.reduce(
      (max, card) => Math.max(max, card.orderIndex || 0),
      0,
    );

    await db.updateItem("cards", cardId, {
      cardSetId: targetCardSetId,
      folderId: targetSet.folderId ?? "",
      orderIndex: maxOrderIndex + 1,
      updatedAt: new Date(),
    });
  };

  /**
   * フォルダ内のカードを並び替え
   * - cardIds の順序で orderIndex を 0, 1, 2, ... n-1 に振り直す
   */
  const reorderCards = async (folderId: string, cardIds: string[]) => {
    if (!currentUser) throw new Error("認証が必要です");

    const db = await getLocalDb(currentUser.uid);

    // 各カードの orderIndex を更新
    const updates = cardIds.map((cardId, index) =>
      db.updateItem("cards", cardId, {
        orderIndex: index,
        updatedAt: new Date(),
      }),
    );

    await Promise.all(updates);
  };

  return {
    cards,
    loading,
    error,
    createCard,
    updateCard,
    deleteCard,
    toggleFlag,
    moveCardToSet,
    reorderCards,
  };
};
