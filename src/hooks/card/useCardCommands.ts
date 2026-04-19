import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import {
  normalizeCardFolderId,
  resolveBlocksFromCardData,
  resolveExtraRowsFromCardData,
  resolveInkFromCardData,
} from "@/domain/card/normalizers/cardShape";
import {
  DEFAULT_LAYOUT_ROWS,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { useAuthSession } from "@/contexts/AuthContext";
import { getLocalDb } from "@/services/localDB";
import type { Card, CardPatch } from "@/types";
import {
  DEFAULT_SETTINGS,
  useUserSettings,
} from "@/hooks/settings/useUserSettings";

export const useCardCommands = (folderId?: string) => {
  const { currentUser } = useAuthSession();
  const { settings } = useUserSettings();

  const createCard = async (
    cardData: Partial<Card> & { cardSetId?: string },
  ) => {
    if (!currentUser) throw new Error("認証が必要です");

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
        const cardSet = await db.cardSets.get(requestedCardSetId);
        if (cardSet && !cardSet.isDeleted) {
          return { cardSetId: cardSet.id, folderId: cardSet.folderId ?? null };
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
          (cardSet) =>
            !cardSet.isDeleted &&
            (cardSet.folderId ?? null) === targetFolderOrNull,
        )
        .sort((left, right) => {
          const orderLeft = left.orderIndex ?? 0;
          const orderRight = right.orderIndex ?? 0;
          if (orderLeft !== orderRight) return orderLeft - orderRight;
          return (
            new Date(left.createdAt ?? 0).getTime() -
            new Date(right.createdAt ?? 0).getTime()
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
          (maxOrder, cardSet) => Math.max(maxOrder, cardSet.orderIndex ?? 0),
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

    const orderIndex =
      cardData.orderIndex ??
      Date.now() * 10000 + Math.floor(Math.random() * 10000);

    const cardSetCardCount = await db.cards
      .where("cardSetId")
      .equals(resolvedCardSet.cardSetId)
      .count();
    const questionNumber =
      cardData.questionNumber ?? `Q${cardSetCardCount + 1}`;
    const id = crypto.randomUUID();

    const nextReviewDate = (() => {
      if (cardData.nextReviewDate) return cardData.nextReviewDate;

      const nextDate = new Date(now);
      if (startNextDay) {
        nextDate.setDate(nextDate.getDate() + 1);
      }
      nextDate.setHours(0, 0, 0, 0);
      return nextDate;
    })();

    const normalizedReviewLogs = Array.isArray(cardData.reviewLogs)
      ? [...cardData.reviewLogs].sort(
          (left, right) =>
            new Date(left.reviewedAt).getTime() -
            new Date(right.reviewedAt).getTime(),
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
      orderIndex,
      questionNumber,
      title: cardData.title || "",
      isDraft: cardData.isDraft ?? false,
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
        (cardData as unknown as { layoutRows?: unknown; layout_rows?: unknown })
          .layoutRows ??
          (
            cardData as unknown as {
              layoutRows?: unknown;
              layout_rows?: unknown;
            }
          ).layout_rows ??
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
      await db.addItem("cards", newCard);
      return newCard;
    } catch (err) {
      console.error("[useCardCommands.createCard] ERROR during LocalDB add", {
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
    const rawCurrentCard = await db.cards.get(id);
    const currentCard = rawCurrentCard ? normalizeCard(rawCurrentCard) : null;

    if (!currentCard) {
      console.warn("[useCardCommands.updateCard] Card not found:", id);
      return;
    }

    const rawPatch = data as Record<string, unknown>;
    if (rawPatch.cardSetId !== undefined || rawPatch.folderId !== undefined) {
      throw new Error(
        "updateCard では cardSetId / folderId を直接更新できません。moveCardToSet を使用してください。",
      );
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
      nextFront.extraRows = resolveExtraRowsFromCardData(patch, "question");
    }
    if ("back" in patch) {
      nextBack.ink = resolveInkFromCardData(patch, "answer");
      nextBack.extraRows = resolveExtraRowsFromCardData(patch, "answer");
    }

    patch.front = nextFront;
    patch.back = nextBack;
    delete patch.frontBlocks;
    delete patch.backBlocks;

    if (Array.isArray(patch.reviewLogs)) {
      patch.reviewLogs = [...patch.reviewLogs].sort(
        (left, right) =>
          new Date(left.reviewedAt).getTime() -
          new Date(right.reviewedAt).getTime(),
      );
    }

    await db.updateItem("cards", id, {
      ...patch,
      updatedAt: new Date(),
    });
  };

  const deleteCard = async (id: string) => {
    if (!currentUser) throw new Error("認証が必要です");
    const db = await getLocalDb(currentUser.uid);
    await db.softDelete("cards", id);
  };

  const toggleFlag = async (
    id: string,
    flag: "hasUncertainty" | "isCompleted" | "isSilent" | "isBookmarked",
  ) => {
    if (!currentUser) throw new Error("認証が必要です");
    const db = await getLocalDb(currentUser.uid);
    const rawCard = await db.cards.get(id);
    const card = rawCard ? normalizeCard(rawCard) : null;

    if (!card) {
      return;
    }

    await updateCard(id, { [flag]: !card[flag] });
  };

  const moveCardToSet = async (cardId: string, targetCardSetId: string) => {
    if (!currentUser) throw new Error("認証が必要です");
    const db = await getLocalDb(currentUser.uid);

    const targetSet = await db.cardSets.get(targetCardSetId);
    if (!targetSet || targetSet.isDeleted) {
      throw new Error("移動先のカードセットが見つかりません");
    }

    const allCards = await db.getAllCards();
    const targetCards = allCards.filter(
      (card) => card.cardSetId === targetCardSetId && !card.isDeleted,
    );

    const maxOrderIndex = targetCards.reduce(
      (maxOrder, card) => Math.max(maxOrder, card.orderIndex || 0),
      0,
    );

    await db.updateItem("cards", cardId, {
      cardSetId: targetCardSetId,
      orderIndex: maxOrderIndex + 1,
      updatedAt: new Date(),
    });
  };

  const reorderCardsInCardSet = async (
    cardSetId: string,
    cardIds: string[],
  ) => {
    if (!currentUser) throw new Error("認証が必要です");
    if (!cardSetId) throw new Error("カードセットIDが必要です");

    const db = await getLocalDb(currentUser.uid);
    const targetCards = await db.cards.bulkGet(cardIds);
    const missingCardIndex = targetCards.findIndex((card) => !card);
    if (missingCardIndex >= 0) {
      throw new Error(
        `並び替え対象カードが見つかりません: ${cardIds[missingCardIndex]}`,
      );
    }

    const outOfScopeCard = targetCards.find(
      (card) => card?.cardSetId !== cardSetId,
    );
    if (outOfScopeCard) {
      throw new Error(
        `CardSet スコープ外カードが混入しています: ${outOfScopeCard.id}`,
      );
    }

    const updates = cardIds.map((cardId, index) =>
      db.updateItem("cards", cardId, {
        orderIndex: index,
        updatedAt: new Date(),
      }),
    );

    await Promise.all(updates);
  };

  return {
    createCard,
    updateCard,
    deleteCard,
    toggleFlag,
    moveCardToSet,
    reorderCardsInCardSet,
  };
};
