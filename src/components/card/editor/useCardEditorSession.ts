import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type SetStateAction,
} from "react";

import { sortBlocksByOrderIndex } from "@/components/card/blocks/core/blockOrdering";
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
import { getCardBlocks } from "@/domain/card/content";
import { useCardEntity } from "@/hooks/card/useCardEntity";
import { resolveCardTagNames } from "@/hooks/settings/useTags";
import { sanitizeUploadedImages } from "@/utils/uploaded-image/sanitizer";

import type { UploadedImage } from "@/types/domain/assets";
import type { Card, CardBlock } from "@/types/domain/card";

const NEW_SENTINEL = "__new__" as const;
const AUTOSAVE_DELAY_MS = 700;

type UseCardEditorSessionParams = {
  selectedCardId: string | null;
  selectedCardSnapshot?: Card | null;
  resolveCardFromEntity?: boolean;
  folderId?: string;
  cardSetId?: string;
  autoEdit?: boolean;

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

type FlushReason =
  | "autosave"
  | "manual"
  | "switch"
  | "edit-end"
  | "unmount"
  | "visibility";

type FlushDraftOptions = {
  reason?: FlushReason;
  exitEditing?: boolean;
  showSuccessToast?: boolean;
};

type PersistResult =
  | { ok: true; operation: "created" | "updated" | "noop"; saved: boolean }
  | { ok: false; message: string };

function cloneBlock(block: CardBlock): CardBlock {
  return {
    ...block,
    images: block.images?.map((image) => ({ ...image })),
    audios: block.audios?.map((audio) => ({ ...audio })),
    references: block.references?.map((reference) => ({ ...reference })),
    code: block.code ? { ...block.code } : undefined,
    math: block.math ? { ...block.math } : undefined,
  };
}

function snapshotDraft(draft: EditorDraft): EditorDraft {
  return {
    title: draft.title,
    tags: [...draft.tags],
    isDraft: draft.isDraft,
    frontBlocks: draft.frontBlocks.map(cloneBlock),
    backBlocks: draft.backBlocks.map(cloneBlock),
    layoutRows: draft.layoutRows,
  };
}

function draftSignature(draft: EditorDraft | null): string | null {
  if (!draft) return null;
  return JSON.stringify({
    title: draft.title,
    tags: draft.tags,
    isDraft: draft.isDraft,
    frontBlocks: draft.frontBlocks,
    backBlocks: draft.backBlocks,
    layoutRows: normalizeLayoutRows(draft.layoutRows),
  });
}

function sanitizeBlocksForSave(blocks: CardBlock[]): CardBlock[] {
  const next: CardBlock[] = [];
  for (const block of blocks ?? []) {
    if (block?.type === "image") {
      next.push({
        ...block,
        images: sanitizeUploadedImages(block.images ?? []) as UploadedImage[],
      });
      continue;
    }
    if (block?.type === "reference") {
      const cleaned = sanitizeReferences(block.references ?? []);
      if (cleaned.length === 0) continue;
      next.push({ ...block, references: cleaned });
      continue;
    }
    next.push(block);
  }
  return normalizeOrderIndex(next);
}

function hasMeaningfulBlock(block: CardBlock): boolean {
  if (block.type === "text") return String(block.content ?? "").trim().length > 0;
  if (block.type === "markdown")
    return String(block.markdown ?? "").trim().length > 0;
  if (block.type === "code")
    return String(block.code?.code ?? "").trim().length > 0;
  if (block.type === "math")
    return String(block.math?.latex ?? "").trim().length > 0;
  if (block.type === "image") return (block.images?.length ?? 0) > 0;
  if (block.type === "reference")
    return sanitizeReferences(block.references ?? []).length > 0;
  if (block.type === "audio") return (block.audios?.length ?? 0) > 0;
  if (block.type === "question") {
    return (
      String(block.questionTitle ?? "").trim().length > 0 ||
      String(block.questionAnswer ?? "").trim().length > 0
    );
  }
  return false;
}

function hasMeaningfulDraft(draft: EditorDraft): boolean {
  if (draft.title.trim().length > 0) return true;
  if (draft.tags.some((tag) => tag.trim().length > 0)) return true;
  if (draft.isDraft) return true;
  if (draft.frontBlocks.some(hasMeaningfulBlock)) return true;
  if (draft.backBlocks.some(hasMeaningfulBlock)) return true;
  return false;
}

function extractCreatedCardId(created: unknown): string | null {
  if (typeof created === "string" && created.trim().length > 0) return created;
  if (!created || typeof created !== "object") return null;
  if (
    "id" in created &&
    typeof (created as { id?: unknown }).id === "string" &&
    (created as { id: string }).id.trim().length > 0
  ) {
    return (created as { id: string }).id;
  }
  if (
    "cardId" in created &&
    typeof (created as { cardId?: unknown }).cardId === "string" &&
    (created as { cardId: string }).cardId.trim().length > 0
  ) {
    return (created as { cardId: string }).cardId;
  }
  return null;
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export function useCardEditorSession({
  selectedCardId,
  selectedCardSnapshot = null,
  resolveCardFromEntity = true,
  folderId,
  cardSetId,
  autoEdit,
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
  const [isEditing, setIsEditingState] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [draft, setDraftState] = useState<EditorDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftRef = useRef<EditorDraft | null>(null);
  const persistedSignatureRef = useRef<string | null>(null);
  const draftRevisionRef = useRef(0);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const selectionBeforeCreateRef = useRef<string | null>(null);
  const persistentCardIdRef = useRef<string | null>(null);
  const skipNextEditEndFlushRef = useRef(false);
  const prevIsEditingRef = useRef(false);
  const normalizedSelectedCardIdRef = useRef<string | null>(null);
  const lastSavedAtRef = useRef<Date | null>(null);
  lastSavedAtRef.current = lastSavedAt;

  const setIsEditing = useCallback((next: SetStateAction<boolean>) => {
    setIsEditingState((prev) =>
      typeof next === "function"
        ? (next as (prevState: boolean) => boolean)(prev)
        : next,
    );
  }, []);

  const updateDirtyFromDraft = useCallback((nextDraft: EditorDraft | null) => {
    const nextSignature = draftSignature(nextDraft);
    setIsDirty(nextSignature !== persistedSignatureRef.current);
  }, []);

  const applyDraft = useCallback(
    (
      next: SetStateAction<EditorDraft | null>,
      options?: { markDirty?: boolean; resetPersisted?: boolean; lastSavedAt?: Date | null },
    ) => {
      const previous = draftRef.current;
      const resolved =
        typeof next === "function"
          ? (next as (prevState: EditorDraft | null) => EditorDraft | null)(previous)
          : next;
      draftRef.current = resolved;
      setDraftState(resolved);

      if (options?.resetPersisted) {
        persistedSignatureRef.current = draftSignature(resolved);
        draftRevisionRef.current = 0;
        setLastSavedAt(options.lastSavedAt ?? null);
        setSaveError(null);
        setIsDirty(false);
        return;
      }

      if (options?.markDirty !== false && resolved !== previous) {
        draftRevisionRef.current += 1;
      }
      updateDirtyFromDraft(resolved);
    },
    [updateDirtyFromDraft],
  );

  const setDraft = useCallback(
    (next: SetStateAction<EditorDraft | null>) => {
      applyDraft(next, { markDirty: true });
    },
    [applyDraft],
  );

  const editingCardIdRef = useRef<string | null>(null);
  const hydratedFromIdRef = useRef<string | null>(null);
  const autoOpenCheckedIdRef = useRef<string | null>(null);
  const isEditingRef = useRef(false);
  isEditingRef.current = isEditing;

  useEffect(() => {
    if (selectedCardId != null) setLocalSelectedCardId(null);
  }, [selectedCardId]);

  const effectiveSelectedCardId = selectedCardId ?? localSelectedCardId;
  const normalizedSelectedCardId = useMemo(
    () => normalizeSelectedCardId(effectiveSelectedCardId),
    [effectiveSelectedCardId],
  );
  normalizedSelectedCardIdRef.current = normalizedSelectedCardId;

  const isNew = normalizedSelectedCardId === NEW_SENTINEL;

  const { effectiveCard } = useCardEntity(
    resolveCardFromEntity && !isNew ? normalizedSelectedCardId : null,
  );
  const selectedCard = useMemo(() => {
    if (
      selectedCardSnapshot &&
      normalizedSelectedCardId &&
      normalizedSelectedCardId !== NEW_SENTINEL &&
      selectedCardSnapshot.id === normalizedSelectedCardId
    ) {
      return selectedCardSnapshot;
    }
    if (
      effectiveCard &&
      normalizedSelectedCardId &&
      effectiveCard.id === normalizedSelectedCardId
    ) {
      return effectiveCard;
    }
    return null;
  }, [effectiveCard, normalizedSelectedCardId, selectedCardSnapshot]);

  const selectedCardRef = useRef<Card | null>(null);
  selectedCardRef.current = selectedCard ?? null;

  const buildDraftFromCard = useCallback(
    (card: Card): EditorDraft => {
      const legacyQuestionRows = normalizeExtraRows(
        (card as unknown as { questionExtraRows?: unknown; question_extra_rows?: unknown })
          .questionExtraRows ??
          (card as unknown as { questionExtraRows?: unknown; question_extra_rows?: unknown })
            .question_extra_rows ??
          0,
      );
      const legacyAnswerRows = normalizeExtraRows(
        (card as unknown as { answerExtraRows?: unknown; answer_extra_rows?: unknown })
          .answerExtraRows ??
          (card as unknown as { answerExtraRows?: unknown; answer_extra_rows?: unknown })
            .answer_extra_rows ??
          0,
      );
      const migratedRows =
        LEGACY_BASE_LAYOUT_ROWS +
        Math.max(legacyQuestionRows, legacyAnswerRows);

      return {
        title: card.title ?? "",
        tags: resolveCardTagNames(
          card.tagIds,
          (card as unknown as { tags?: unknown }).tags,
          tagById as unknown,
        ),
        isDraft: card.isDraft ?? false,
        frontBlocks: sortBlocksByOrderIndex(getCardBlocks(card, "question")),
        backBlocks: sortBlocksByOrderIndex(getCardBlocks(card, "answer")),
        layoutRows: normalizeLayoutRows(
          (card as unknown as { layoutRows?: unknown; layout_rows?: unknown })
            .layoutRows ??
            (card as unknown as { layoutRows?: unknown; layout_rows?: unknown })
              .layout_rows ??
            migratedRows,
        ),
      };
    },
    [tagById],
  );

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current == null) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }, []);

  const buildSavePayload = useCallback(
    async (currentDraft: EditorDraft): Promise<Partial<Card>> => {
      const normalizedTags = currentDraft.tags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const uniqueTags = [...new Set(normalizedTags)];
      const resolvedTags = await Promise.all(uniqueTags.map((name) => addTag(name)));
      return {
        title: currentDraft.title,
        tagIds: resolvedTags.map((tag) => tag.id),
        isDraft: currentDraft.isDraft,
        front: {
          blocks: sanitizeBlocksForSave(currentDraft.frontBlocks),
        },
        back: {
          blocks: sanitizeBlocksForSave(currentDraft.backBlocks),
        },
        layoutRows: normalizeLayoutRows(currentDraft.layoutRows),
      };
    },
    [addTag],
  );

  const persistCurrentDraft = useCallback(
    async (): Promise<PersistResult> => {
      const currentDraft = draftRef.current;
      if (!currentDraft) {
        return { ok: true, operation: "noop", saved: false };
      }

      const currentSignature = draftSignature(currentDraft);
      if (currentSignature === persistedSignatureRef.current) {
        return { ok: true, operation: "noop", saved: false };
      }

      const draftSnapshotValue = snapshotDraft(currentDraft);
      const snapshotSignature = draftSignature(draftSnapshotValue);
      const cardId = persistentCardIdRef.current ?? selectedCardRef.current?.id ?? null;

      if (!cardId && !hasMeaningfulDraft(draftSnapshotValue)) {
        persistedSignatureRef.current = snapshotSignature;
        updateDirtyFromDraft(draftRef.current);
        return { ok: true, operation: "noop", saved: false };
      }

      try {
        setIsAutosaving(true);
        setSaveError(null);

        const payload = await buildSavePayload(draftSnapshotValue);

        if (!cardId) {
          if (typeof createCard !== "function") {
            throw new Error("カードの作成関数が見つかりません");
          }

          selectionBeforeCreateRef.current = normalizedSelectedCardIdRef.current;
          const created = await createCard({
            ...payload,
            folderId: folderId ?? "",
            cardSetId,
          });
          const newId = extractCreatedCardId(created);
          if (!newId) {
            throw new Error("作成したカードの ID を取得できませんでした");
          }

          persistentCardIdRef.current = newId;
          editingCardIdRef.current = newId;
          hydratedFromIdRef.current = newId;
          onCardUpdated?.();

          if (
            selectionBeforeCreateRef.current === NEW_SENTINEL &&
            normalizedSelectedCardIdRef.current === NEW_SENTINEL &&
            isEditingRef.current
          ) {
            if (typeof onSelectCardId === "function") onSelectCardId(newId);
            else setLocalSelectedCardId(newId);
          }

          persistedSignatureRef.current = snapshotSignature;
          updateDirtyFromDraft(draftRef.current);
          setLastSavedAt(new Date());
          return { ok: true, operation: "created", saved: true };
        }

        await updateCard(cardId, payload);
        onCardUpdated?.();
        persistedSignatureRef.current = snapshotSignature;
        updateDirtyFromDraft(draftRef.current);
        setLastSavedAt(new Date());
        return { ok: true, operation: "updated", saved: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "カード保存に失敗しました";
        setSaveError(message);
        return { ok: false, message };
      } finally {
        setIsAutosaving(false);
      }
    },
    [
      buildSavePayload,
      cardSetId,
      createCard,
      folderId,
      onCardUpdated,
      onSelectCardId,
      updateCard,
      updateDirtyFromDraft,
    ],
  );

  const flushDraft = useCallback(
    async ({
      reason = "manual",
      exitEditing = false,
      showSuccessToast = reason === "manual",
    }: FlushDraftOptions = {}): Promise<boolean> => {
      clearAutosaveTimer();

      let flushSucceeded = true;
      let savedOperation: PersistResult["operation"] = "noop";
      let savedAny = false;

      const queued = saveQueueRef.current.then(async () => {
        while (true) {
          const result = await persistCurrentDraft();
          if (!result.ok) {
            flushSucceeded = false;
            if (reason === "manual") {
              toastError?.(result.message);
            }
            return;
          }

          savedOperation = result.operation;
          savedAny = savedAny || result.saved;

          if (
            !draftRef.current ||
            draftSignature(draftRef.current) === persistedSignatureRef.current
          ) {
            return;
          }
        }
      });

      saveQueueRef.current = queued.catch(() => undefined);
      await queued;

      if (flushSucceeded && showSuccessToast && savedAny) {
        toastSuccess?.(
          savedOperation === "created"
            ? "カードを作成しました"
            : "カードを更新しました",
        );
      }

      if (flushSucceeded && exitEditing && !autoEdit) {
        skipNextEditEndFlushRef.current = true;
        setIsEditing(false);
      }

      return flushSucceeded;
    },
    [
      autoEdit,
      clearAutosaveTimer,
      persistCurrentDraft,
      setIsEditing,
      toastError,
      toastSuccess,
    ],
  );

  useEffect(() => {
    if (!normalizedSelectedCardId) {
      setIsFlipped(false);
      setIsEditing(false);
      applyDraft(null, { resetPersisted: true, lastSavedAt: null });
      editingCardIdRef.current = null;
      hydratedFromIdRef.current = null;
      autoOpenCheckedIdRef.current = null;
      persistentCardIdRef.current = null;
      return;
    }

    setIsFlipped(false);

    if (
      normalizedSelectedCardId !== NEW_SENTINEL &&
      persistentCardIdRef.current === normalizedSelectedCardId &&
      draftRef.current
    ) {
      setIsEditing(true);
      editingCardIdRef.current = normalizedSelectedCardId;
      hydratedFromIdRef.current = normalizedSelectedCardId;
      autoOpenCheckedIdRef.current = normalizedSelectedCardId;
      return;
    }

    if (normalizedSelectedCardId === NEW_SENTINEL) {
      setIsEditing(true);
      persistentCardIdRef.current = null;
      applyDraft((prev) => prev ?? makeNewDraft(), {
        resetPersisted: draftRef.current == null,
        lastSavedAt: null,
      });
      editingCardIdRef.current = NEW_SENTINEL;
      hydratedFromIdRef.current = NEW_SENTINEL;
      autoOpenCheckedIdRef.current = NEW_SENTINEL;
      return;
    }

    persistentCardIdRef.current = normalizedSelectedCardId;
    const shouldAutoEdit = Boolean(autoEdit);
    setIsEditing(shouldAutoEdit);
    if (!shouldAutoEdit) {
      applyDraft(null, { resetPersisted: true, lastSavedAt: null });
    }
    editingCardIdRef.current = null;
    hydratedFromIdRef.current = null;
    autoOpenCheckedIdRef.current = null;
  }, [applyDraft, autoEdit, normalizedSelectedCardId, setIsEditing]);

  useEffect(() => {
    if (
      !normalizedSelectedCardId ||
      normalizedSelectedCardId === NEW_SENTINEL ||
      !selectedCard ||
      isEditing
    ) {
      return;
    }
    if (autoOpenCheckedIdRef.current === normalizedSelectedCardId) return;
    autoOpenCheckedIdRef.current = normalizedSelectedCardId;
    if (shouldAutoOpenEditorForCard(selectedCard)) setIsEditing(true);
  }, [isEditing, normalizedSelectedCardId, selectedCard, setIsEditing]);

  useEffect(() => {
    if (isEditing) {
      editingCardIdRef.current = isNew
        ? NEW_SENTINEL
        : persistentCardIdRef.current ?? normalizedSelectedCardId;
      return;
    }
    editingCardIdRef.current = null;
    hydratedFromIdRef.current = null;
    if (skipNextEditEndFlushRef.current) {
      skipNextEditEndFlushRef.current = false;
      applyDraft(null, {
        resetPersisted: true,
        lastSavedAt: lastSavedAtRef.current,
      });
      return;
    }
  }, [applyDraft, isEditing, isNew, normalizedSelectedCardId]);

  useLayoutEffect(() => {
    if (!isEditing) return;

    const targetId = isNew
      ? persistentCardIdRef.current ?? NEW_SENTINEL
      : persistentCardIdRef.current ?? normalizedSelectedCardId;
    if (!targetId) return;

    if (targetId === NEW_SENTINEL) {
      applyDraft((prev) => prev ?? makeNewDraft(), {
        resetPersisted: draftRef.current == null,
        lastSavedAt: null,
      });
      hydratedFromIdRef.current = NEW_SENTINEL;
      return;
    }

    if (!selectedCard) return;
    if (hydratedFromIdRef.current === targetId) return;

    const nextDraft = buildDraftFromCard(selectedCard);
    applyDraft(nextDraft, {
      resetPersisted: true,
      lastSavedAt:
        toDateOrNull((selectedCard as { updatedAt?: unknown }).updatedAt) ??
        toDateOrNull((selectedCard as { createdAt?: unknown }).createdAt),
    });
    persistentCardIdRef.current = targetId;
    hydratedFromIdRef.current = targetId;
  }, [
    applyDraft,
    buildDraftFromCard,
    isEditing,
    isNew,
    normalizedSelectedCardId,
    selectedCard,
  ]);

  useEffect(() => {
    if (!isEditing || !draft || !isDirty) {
      clearAutosaveTimer();
      return;
    }

    clearAutosaveTimer();
    autosaveTimerRef.current = setTimeout(() => {
      void flushDraft({ reason: "autosave", showSuccessToast: false });
    }, AUTOSAVE_DELAY_MS);

    return clearAutosaveTimer;
  }, [clearAutosaveTimer, draft, flushDraft, isDirty, isEditing]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (!draftRef.current) return;
      void flushDraft({ reason: "switch", showSuccessToast: false });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedSelectedCardId]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (!draftRef.current) return;
      void flushDraft({ reason: "unmount", showSuccessToast: false });
    };
  }, [clearAutosaveTimer, flushDraft]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const handleVisibilityFlush = () => {
      if (document.visibilityState !== "hidden") return;
      if (!draftRef.current) return;
      void flushDraft({ reason: "visibility", showSuccessToast: false });
    };
    const handlePageHide = () => {
      if (!draftRef.current) return;
      void flushDraft({ reason: "visibility", showSuccessToast: false });
    };

    document.addEventListener("visibilitychange", handleVisibilityFlush);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityFlush);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [flushDraft]);

  useEffect(() => {
    const wasEditing = prevIsEditingRef.current;
    prevIsEditingRef.current = isEditing;
    if (!wasEditing || isEditing) return;
    if (skipNextEditEndFlushRef.current) return;
    if (!draftRef.current) {
      applyDraft(null, {
        resetPersisted: true,
        lastSavedAt: lastSavedAtRef.current,
      });
      return;
    }
    void flushDraft({ reason: "edit-end", showSuccessToast: false }).finally(() => {
      applyDraft(null, {
        resetPersisted: true,
        lastSavedAt: lastSavedAtRef.current,
      });
    });
  }, [applyDraft, flushDraft, isEditing]);

  const handleStartNew = useCallback(() => {
    persistentCardIdRef.current = null;
    applyDraft(makeNewDraft(), { resetPersisted: true, lastSavedAt: null });
    setIsEditing(true);

    if (typeof onSelectCardId === "function") onSelectCardId(NEW_SENTINEL);
    else setLocalSelectedCardId(NEW_SENTINEL);
  }, [applyDraft, onSelectCardId, setIsEditing]);

  const handleCancel = useCallback(() => {
    skipNextEditEndFlushRef.current = true;
    setIsAutosaving(false);
    setSaveError(null);
    resetDialogs();
    applyDraft(null, { resetPersisted: true, lastSavedAt: null });
    setIsEditing(false);
    persistentCardIdRef.current = selectedCardRef.current?.id ?? null;

    if (!selectedCardId && localSelectedCardId === NEW_SENTINEL) {
      setLocalSelectedCardId(null);
    }
  }, [
    applyDraft,
    localSelectedCardId,
    resetDialogs,
    selectedCardId,
    setIsEditing,
  ]);

  const handleSave = useCallback(async (): Promise<boolean> => {
    return await flushDraft({
      reason: "manual",
      exitEditing: true,
      showSuccessToast: true,
    });
  }, [flushDraft]);

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
      const normalizedTags = nextTags
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
      const resolved = await Promise.all(normalizedTags.map((name) => addTag(name)));
      await updateCard(selectedCard.id, {
        tagIds: resolved.map((tag) => tag.id),
      });
      onCardUpdated?.();
    },
    [addTag, isEditing, onCardUpdated, selectedCard, setDraft, updateCard],
  );

  const handleToggleDraft = useCallback(
    async (nextIsDraft: boolean) => {
      if (isEditing) {
        setDraft((prev) => (prev ? { ...prev, isDraft: nextIsDraft } : prev));
        return;
      }
      if (!selectedCard) return;
      await updateCard(selectedCard.id, { isDraft: nextIsDraft });
      onCardUpdated?.();
    },
    [isEditing, onCardUpdated, selectedCard, setDraft, updateCard],
  );

  const handleUpdateTitle = useCallback(
    async (nextTitle: string) => {
      if (isEditing) {
        setDraft((prev) => (prev ? { ...prev, title: nextTitle } : prev));
        return;
      }
      if (!selectedCard) return;
      if ((selectedCard.title ?? "") === nextTitle) return;
      await updateCard(selectedCard.id, { title: nextTitle });
      onCardUpdated?.();
    },
    [isEditing, onCardUpdated, selectedCard, setDraft, updateCard],
  );

  const handleTitleInputChange = useCallback(
    (nextTitle: string) => {
      if (!isEditing) return;
      setDraft((prev) => (prev ? { ...prev, title: nextTitle } : prev));
    },
    [isEditing, setDraft],
  );

  const hasDraft = draft != null;
  const draftTitle = draft?.title ?? "";
  const draftTags = draft?.tags ?? [];
  const draftIsDraft = draft?.isDraft ?? false;
  const draftLayoutRows = draft?.layoutRows;

  const panelCard = useMemo(() => {
    if (selectedCard) {
      if (!isEditing || !hasDraft) return selectedCard;
      return {
        ...selectedCard,
        title: draftTitle,
        tags: draftTags,
        isDraft: draftIsDraft,
        layoutRows: draftLayoutRows,
      };
    }
    if (!hasDraft) return null;

    const now = new Date();
    return {
      id: "__draft__",
      userId: "",
      deviceId: "web",
      folderId: "",
      cardSetId: "",
      orderIndex: 0,
      questionNumber: "",
      title: draftTitle,
      tags: draftTags,
      isDraft: draftIsDraft,
      isDeleted: false,
      hasUncertainty: false,
      isBookmarked: false,
      isCompleted: false,
      isSilent: false,
      front: { blocks: [] },
      back: { blocks: [] },
      memoryStability: 0,
      nextReviewDate: now,
      createdAt: now,
      updatedAt: now,
      reviewLogs: [],
      layoutRows: draftLayoutRows,
    } as Card;
  }, [
    draftIsDraft,
    draftLayoutRows,
    draftTags,
    draftTitle,
    hasDraft,
    isEditing,
    selectedCard,
  ]);

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
    isSaving: isAutosaving,
    isAutosaving,
    isDirty,
    lastSavedAt,
    saveError,
    flushDraft,
    handleStartNew,
    handleCancel,
    handleSave,
    handleToggleBookmark,
    handleToggleUncertainty,
    handleUpdateTags,
    handleToggleDraft,
    handleTitleInputChange,
    handleUpdateTitle,
    panelCard,
  };
}


