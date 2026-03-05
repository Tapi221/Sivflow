import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { sortBlocksByOrderIndex } from "@/components/card/blocks/blockOrdering";
import {
  makeNewDraft,
  normalizeOrderIndex,
  normalizeSelectedCardId,
  sanitizeReferences,
  shouldAutoOpenEditorForCard,
  type EditorDraft,
} from "@/components/card/editor/cardEditorUtils";
import {
  LEGACY_BASE_LAYOUT_ROWS,
  normalizeExtraRows,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { resolveCardTagNames } from "@/hooks/useTags";

import type { CardBlock, Card, UploadedImage } from "@/types";

const NEW_SENTINEL = "__new__" as const;

type UseCardEditorSessionParams = {
  selectedCardId: string | null;
  folderId?: string;
  autoEdit?: boolean;
  cards: Card[];
  updateCard: (id: string, data: Partial<Card>) => Promise<unknown>;
  createCard?: (data: Partial<Card>) => Promise<unknown>;
  addTag: (name: string) => Promise<{ id: string }>;
  tagById: Map<string, unknown> | Record<string, unknown>;
  toastSuccess?: (message: string) => void;
  toastError?: (message: string) => void;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
  resetDialogs: () => void;
};

export function useCardEditorSession({
  selectedCardId,
  folderId,
  autoEdit,
  cards,
  updateCard,
  createCard,
  addTag,
  tagById,
  toastSuccess,
  toastError,
  onCardUpdated,
  onSelectCardId,
  resetDialogs,
}: UseCardEditorSessionParams) {
  const [localSelectedCardId, setLocalSelectedCardId] = useState<string | null>(
    null,
  );
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<EditorDraft | null>(null);

  const editingCardIdRef = useRef<string | null>(null);
  const hydratedFromIdRef = useRef<string | null>(null);
  const autoOpenCheckedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (selectedCardId != null) setLocalSelectedCardId(null);
  }, [selectedCardId]);

  const effectiveSelectedCardId = selectedCardId ?? localSelectedCardId;
  const normalizedSelectedCardId = useMemo(
    () => normalizeSelectedCardId(effectiveSelectedCardId),
    [effectiveSelectedCardId],
  );
  const isNew = normalizedSelectedCardId === NEW_SENTINEL;

  const selectedCard = useMemo(() => {
    if (!normalizedSelectedCardId || isNew) return null;
    return cards.find((card) => card.id === normalizedSelectedCardId) ?? null;
  }, [cards, normalizedSelectedCardId, isNew]);

  const buildDraftFromCard = useCallback(
    (card: Card): EditorDraft => {
      const legacyQuestionRows = normalizeExtraRows(
        (card as unknown)?.questionExtraRows ??
          (card as unknown)?.question_extra_rows ??
          0,
      );
      const legacyAnswerRows = normalizeExtraRows(
        (card as unknown)?.answerExtraRows ?? (card as unknown)?.answer_extra_rows ?? 0,
      );
      const migratedRows =
        LEGACY_BASE_LAYOUT_ROWS +
        Math.max(legacyQuestionRows, legacyAnswerRows);

      return {
        title: card.title ?? "",
        tags: resolveCardTagNames(
          card.tagIds,
          (card as unknown).tags,
          tagById as unknown,
        ),
        isDraft: card.isDraft ?? false,
        questionImages: ((card as unknown).questionImages ?? []) as UploadedImage[],
        answerImages: ((card as unknown).answerImages ?? []) as UploadedImage[],
        questionBlocks: sortBlocksByOrderIndex(
          (card.questionBlocks ?? []) as CardBlock[],
        ),
        answerBlocks: sortBlocksByOrderIndex(
          (card.answerBlocks ?? []) as CardBlock[],
        ),
        layoutRows: normalizeLayoutRows(
          (card as unknown).layoutRows ?? (card as unknown).layout_rows ?? migratedRows,
        ),
      };
    },
    [tagById],
  );

  useEffect(() => {
    if (!normalizedSelectedCardId) {
      setIsFlipped(false);
      setIsEditing(false);
      setDraft(null);
      editingCardIdRef.current = null;
      hydratedFromIdRef.current = null;
      autoOpenCheckedIdRef.current = null;
      return;
    }

    setIsFlipped(false);

    if (normalizedSelectedCardId === NEW_SENTINEL) {
      setIsEditing(true);
      setDraft((prev) => prev ?? makeNewDraft());
      editingCardIdRef.current = NEW_SENTINEL;
      hydratedFromIdRef.current = NEW_SENTINEL;
      autoOpenCheckedIdRef.current = NEW_SENTINEL;
      return;
    }

    setIsEditing(!!autoEdit);
    setDraft(null);
    editingCardIdRef.current = null;
    hydratedFromIdRef.current = null;
    autoOpenCheckedIdRef.current = null;
  }, [autoEdit, normalizedSelectedCardId]);

  useEffect(() => {
    if (
      !normalizedSelectedCardId ||
      normalizedSelectedCardId === NEW_SENTINEL ||
      !selectedCard ||
      isEditing
    )
      return;
    if (autoOpenCheckedIdRef.current === normalizedSelectedCardId) return;
    autoOpenCheckedIdRef.current = normalizedSelectedCardId;
    if (shouldAutoOpenEditorForCard(selectedCard)) setIsEditing(true);
  }, [normalizedSelectedCardId, selectedCard, isEditing]);

  useEffect(() => {
    if (isEditing) {
      editingCardIdRef.current = isNew
        ? NEW_SENTINEL
        : normalizedSelectedCardId;
      return;
    }
    editingCardIdRef.current = null;
    hydratedFromIdRef.current = null;
    setDraft(null);
  }, [isEditing, isNew, normalizedSelectedCardId]);

  useEffect(() => {
    if (!isEditing) return;

    const targetId = isNew ? NEW_SENTINEL : normalizedSelectedCardId;
    if (!targetId) return;

    if (isNew) {
      setDraft((prev) => prev ?? makeNewDraft());
      hydratedFromIdRef.current = NEW_SENTINEL;
      return;
    }

    if (!selectedCard) return;
    if (hydratedFromIdRef.current === selectedCard.id) return;

    setDraft(buildDraftFromCard(selectedCard));
    hydratedFromIdRef.current = selectedCard.id;
  }, [
    isEditing,
    isNew,
    normalizedSelectedCardId,
    selectedCard,
    buildDraftFromCard,
  ]);

  const handleStartNew = useCallback(() => {
    setDraft(makeNewDraft());
    setIsEditing(true);

    if (typeof onSelectCardId === "function") onSelectCardId(NEW_SENTINEL);
    else setLocalSelectedCardId(NEW_SENTINEL);
  }, [onSelectCardId]);

  const handleCancel = useCallback(() => {
    setIsSaving(false);
    resetDialogs();
    setDraft(null);
    setIsEditing(false);

    if (!selectedCardId && localSelectedCardId === NEW_SENTINEL) {
      setLocalSelectedCardId(null);
    }
  }, [localSelectedCardId, resetDialogs, selectedCardId]);

  const handleSave = useCallback(async () => {
    if (!draft) return;

    try {
      setIsSaving(true);

      const sanitizeBlocksForSave = (blocks: CardBlock[]): CardBlock[] => {
        const next: CardBlock[] = [];
        for (const block of blocks ?? []) {
          if (block?.type === "reference") {
            const cleaned = sanitizeReferences(
              (block as unknown)?.references ?? [],
            );
            if (cleaned.length === 0) continue;
            next.push({ ...(block as unknown), references: cleaned } as CardBlock);
            continue;
          }
          next.push(block);
        }
        return normalizeOrderIndex(next);
      };

      const resolvedTags = await Promise.all(
        draft.tags.map((name) => addTag(name)),
      );
      const tagIds = resolvedTags.map((tag) => tag.id);
      const payload: Partial<Card> = {
        title: draft.title,
        tagIds,
        isDraft: draft.isDraft,
        questionImages: draft.questionImages,
        answerImages: draft.answerImages,
        questionBlocks: sanitizeBlocksForSave(draft.questionBlocks),
        answerBlocks: sanitizeBlocksForSave(draft.answerBlocks),
        layoutRows: normalizeLayoutRows(draft.layoutRows),
      };

      if (isNew) {
        if (typeof createCard !== "function") {
          console.error(
            "[CardEditorPane] createCard が useCards にありません。useCards の作成関数名に合わせて置き換えてください。",
          );
          toastError?.("カードの作成関数が見つかりません");
          return;
        }

        const created = await createCard({
          ...payload,
          folderId: folderId ?? "",
        });
        const newId =
          (typeof created === "object" &&
            created !== null &&
            "id" in created &&
            (created as unknown).id) ||
          (typeof created === "string" ? created : null);

        onCardUpdated?.();
        toastSuccess?.("カードを作成しました");

        if (newId) {
          if (typeof onSelectCardId === "function") onSelectCardId(newId);
          else setLocalSelectedCardId(newId);
        }

        setIsEditing(false);
        return;
      }

      if (!selectedCard) return;

      await updateCard(selectedCard.id, payload);
      onCardUpdated?.();
      toastSuccess?.("カードを更新しました");
      setIsEditing(false);
    } catch (error) {
      console.error("カード保存に失敗しました:", error);
      const message =
        error instanceof Error ? error.message : "カード保存に失敗しました";
      toastError?.(message);
    } finally {
      setIsSaving(false);
    }
  }, [
    addTag,
    createCard,
    draft,
    folderId,
    isNew,
    onCardUpdated,
    onSelectCardId,
    selectedCard,
    toastError,
    toastSuccess,
    updateCard,
  ]);

  const handleToggleBookmark = useCallback(
    async (card: Card) => {
      try {
        await updateCard(card.id, { isBookmarked: !card.isBookmarked });
        onCardUpdated?.();
      } catch (error) {
        console.error("ブックマークの更新に失敗しました:", error);
      }
    },
    [onCardUpdated, updateCard],
  );

  const handleToggleUncertainty = useCallback(
    async (card: Card) => {
      try {
        await updateCard(card.id, { hasUncertainty: !card.hasUncertainty });
        onCardUpdated?.();
      } catch (error) {
        console.error("不確証マークの更新に失敗しました:", error);
      }
    },
    [onCardUpdated, updateCard],
  );

  const handleUpdateTags = useCallback(
    async (nextTags: string[]) => {
      if (isEditing) {
        setDraft((prev) => (prev ? { ...prev, tags: nextTags } : prev));
        return;
      }
      if (!selectedCard) return;
      const resolved = await Promise.all(nextTags.map((name) => addTag(name)));
      await updateCard(selectedCard.id, {
        tagIds: resolved.map((tag) => tag.id),
      });
      onCardUpdated?.();
    },
    [addTag, isEditing, onCardUpdated, selectedCard, updateCard],
  );

  const handleToggleDraft = useCallback(
    async (nextIsDraft: boolean) => {
      if (isEditing) {
        setDraft((prev) => (prev ? { ...prev, isDraft: nextIsDraft } : prev));
      }
      // 既存カード編集中は即同期する。新規カード（selectedCardなし）のみローカル保持。
      if (!selectedCard) return;
      await updateCard(selectedCard.id, { isDraft: nextIsDraft });
      onCardUpdated?.();
    },
    [isEditing, onCardUpdated, selectedCard, updateCard],
  );

  const handleUpdateTitle = useCallback(
    async (nextTitle: string) => {
      if (isEditing) {
        setDraft((prev) => (prev ? { ...prev, title: nextTitle } : prev));
        return;
      }
      if (!selectedCard) return;
      await updateCard(selectedCard.id, { title: nextTitle });
      onCardUpdated?.();
    },
    [isEditing, onCardUpdated, selectedCard, updateCard],
  );

  const panelCard = useMemo(() => {
    if (selectedCard) {
      if (!isEditing || !draft) return selectedCard;
      return {
        ...selectedCard,
        title: draft.title,
        tags: draft.tags,
        isDraft: draft.isDraft,
        layoutRows: draft.layoutRows,
      };
    }
    if (!draft) return null;

    const now = new Date();
    return {
      id: "__draft__",
      userId: "",
      deviceId: "web",
      folderId: "",
      orderIndex: 0,
      questionNumber: "",
      title: draft.title,
      tags: draft.tags,
      isDraft: draft.isDraft,
      isDeleted: false,
      hasUncertainty: false,
      isBookmarked: false,
      isCompleted: false,
      isSilent: false,
      questionText: "",
      questionImages: [],
      questionAudios: [],
      questionMarked: "",
      answerText: "",
      answerImages: [],
      answerAudios: [],
      answerMarked: "",
      memoryStability: 0,
      nextReviewDate: now,
      createdAt: now,
      updatedAt: now,
      reviewLogs: [],
      layoutRows: draft.layoutRows,
    } as Card;
  }, [draft, isEditing, selectedCard]);

  return {
    draft,
    setDraft,
    normalizedSelectedCardId,
    isNew,
    selectedCard,
    isFlipped,
    setIsFlipped,
    isEditing,
    setIsEditing,
    isSaving,
    handleStartNew,
    handleCancel,
    handleSave,
    handleToggleBookmark,
    handleToggleUncertainty,
    handleUpdateTags,
    handleToggleDraft,
    handleUpdateTitle,
    panelCard,
  };
}
