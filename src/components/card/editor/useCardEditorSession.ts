import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";
import type { PersistOperation, PersistResult } from "./cardEditorSessionCore";
import { AUTOSAVE_DELAY_MS, buildCardPatchForToggle, buildDraftFromCard, buildSavePayload, createPanelCard, draftSignature, extractCreatedCardId, hasMeaningfulDraft, NEW_SENTINEL, snapshotDraft, toDateOrNull } from "./cardEditorSessionCore";
import type { EditorDraft } from "./cardEditorUtils";
import { makeNewDraft, normalizeSelectedCardId, shouldAutoOpenEditorForCard } from "./cardEditorUtils";
import { useCardEntity } from "@/components/card/hooks/useCardEntity";
import type { Card, CardPatch } from "@/types/domain/card";



type CreateCardPayload = CardPatch & {
  folderId: string;
  cardSetId?: string;
};
type UseCardEditorSessionParams = {
  selectedCardId: string | null;
  selectedCardSnapshot?: Card | null;
  resolveCardFromEntity?: boolean;
  folderId?: string;
  cardSetId?: string;
  autoEdit?: boolean;

  updateCard: (id: string, data: CardPatch) => Promise<unknown>;
  createCard?: (data: CreateCardPayload) => Promise<unknown>;
  addTag: (name: string) => Promise<{ id: string; }>;
  tagById: Parameters<typeof buildDraftFromCard>[1];
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



const useCardEditorSession = ({ selectedCardId, selectedCardSnapshot = null, resolveCardFromEntity = true, folderId, cardSetId, autoEdit, updateCard, createCard, addTag, tagById, toastSuccess, toastError, onCardUpdated, onSelectCardId, resetDialogs }: UseCardEditorSessionParams) => {
  const [localSelectedCardId, setLocalSelectedCardId] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isEditing, setIsEditingState] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [draft, setDraftState] = useState<EditorDraft | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const draftRef = useRef<EditorDraft | null>(null);
  const persistedSignatureRef = useRef<string | null>(null);
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
      options?: {
        markDirty?: boolean;
        resetPersisted?: boolean;
        lastSavedAt?: Date | null;
      },
    ) => {
      const previous = draftRef.current;
      const resolved =
        typeof next === "function"
          ? (next as (prevState: EditorDraft | null) => EditorDraft | null)(
            previous,
          )
          : next;

      draftRef.current = resolved;
      setDraftState(resolved);

      if (options?.resetPersisted) {
        persistedSignatureRef.current = draftSignature(resolved);
        setLastSavedAt(options.lastSavedAt ?? null);
        setSaveError(null);
        setIsDirty(false);
        return;
      }

      if (options?.markDirty !== false || resolved !== previous) {
        updateDirtyFromDraft(resolved);
      }
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
    if ((selectedCardId !== null && selectedCardId !== undefined)) setLocalSelectedCardId(null);
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

  const clearAutosaveTimer = useCallback(() => {
    if ((autosaveTimerRef.current === null || autosaveTimerRef.current === undefined)) return;
    clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }, []);

  const persistCurrentDraft = useCallback(async (): Promise<PersistResult> => {
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
    const cardId =
      persistentCardIdRef.current ?? selectedCardRef.current?.id ?? null;

    if (!cardId && !hasMeaningfulDraft(draftSnapshotValue)) {
      persistedSignatureRef.current = snapshotSignature;
      updateDirtyFromDraft(draftRef.current);
      return { ok: true, operation: "noop", saved: false };
    }

    try {
      setIsAutosaving(true);
      setSaveError(null);

      const payload = await buildSavePayload({
        draft: draftSnapshotValue,
        addTag,
      });

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
  }, [
    addTag,
    cardSetId,
    createCard,
    folderId,
    onCardUpdated,
    onSelectCardId,
    updateCard,
    updateDirtyFromDraft,
  ]);

  const flushDraft = useCallback(
    async ({
      reason = "manual",
      exitEditing = false,
      showSuccessToast = reason === "manual",
    }: FlushDraftOptions = {}): Promise<boolean> => {
      clearAutosaveTimer();

      const flushState: {
        flushSucceeded: boolean;
        savedOperation: PersistOperation;
        savedAny: boolean;
      } = {
        flushSucceeded: true,
        savedOperation: "noop",
        savedAny: false,
      };

      const queued = saveQueueRef.current.then(async () => {
        while (true) {
          const result = await persistCurrentDraft();
          if (!result.ok) {
            flushState.flushSucceeded = false;
            if (reason === "manual") {
              toastError?.(result.message);
            }
            return;
          }

          flushState.savedOperation = result.operation;
          flushState.savedAny = flushState.savedAny || result.saved;

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

      const successMessageByOperation: Record<PersistOperation, string> = {
        created: "カードを作成しました",
        updated: "カードを更新しました",
        noop: "カードを更新しました",
      };

      if (
        flushState.flushSucceeded &&
        showSuccessToast &&
        flushState.savedAny
      ) {
        toastSuccess?.(successMessageByOperation[flushState.savedOperation]);
      }

      if (flushState.flushSucceeded && exitEditing && !autoEdit) {
        skipNextEditEndFlushRef.current = true;
        setIsEditing(false);
      }

      return flushState.flushSucceeded;
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
        resetPersisted: (draftRef.current === null || draftRef.current === undefined),
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
        : (persistentCardIdRef.current ?? normalizedSelectedCardId);
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
      ? (persistentCardIdRef.current ?? NEW_SENTINEL)
      : (persistentCardIdRef.current ?? normalizedSelectedCardId);
    if (!targetId) return;

    if (targetId === NEW_SENTINEL) {
      applyDraft((prev) => prev ?? makeNewDraft(), {
        resetPersisted: (draftRef.current === null || draftRef.current === undefined),
        lastSavedAt: null,
      });
      hydratedFromIdRef.current = NEW_SENTINEL;
      return;
    }

    if (!selectedCard) return;
    if (hydratedFromIdRef.current === targetId) return;

    const nextDraft = buildDraftFromCard(selectedCard, tagById);
    applyDraft(nextDraft, {
      resetPersisted: true,
      lastSavedAt:
        toDateOrNull((selectedCard as { updatedAt?: unknown; }).updatedAt) ??
        toDateOrNull((selectedCard as { createdAt?: unknown; }).createdAt),
    });
    persistentCardIdRef.current = targetId;
    hydratedFromIdRef.current = targetId;
  }, [
    applyDraft,
    isEditing,
    isNew,
    normalizedSelectedCardId,
    selectedCard,
    tagById,
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
  }, [clearAutosaveTimer, flushDraft, normalizedSelectedCardId]);

  useEffect(() => {
    return () => {
      clearAutosaveTimer();
      if (!draftRef.current) return;
      void flushDraft({ reason: "unmount", showSuccessToast: false });
    };
  }, [clearAutosaveTimer, flushDraft]);

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

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
    void flushDraft({ reason: "edit-end", showSuccessToast: false }).finally(
      () => {
        applyDraft(null, {
          resetPersisted: true,
          lastSavedAt: lastSavedAtRef.current,
        });
      },
    );
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
        await updateCard(
          card.id,
          buildCardPatchForToggle(card, "isBookmarked"),
        );
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
        await updateCard(
          card.id,
          buildCardPatchForToggle(card, "hasUncertainty"),
        );
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

      const payload = await buildSavePayload({
        draft: {
          ...buildDraftFromCard(selectedCard, tagById),
          tags: nextTags,
        },
        addTag,
      });

      await updateCard(selectedCard.id, {
        tagIds: payload.tagIds,
      } as CardPatch);
      onCardUpdated?.();
    },
    [
      addTag,
      isEditing,
      onCardUpdated,
      selectedCard,
      setDraft,
      tagById,
      updateCard,
    ],
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

  const panelCard = useMemo(
    () =>
      createPanelCard({
        selectedCard,
        draft,
        isEditing,
      }),
    [draft, isEditing, selectedCard],
  );

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
};



export { useCardEditorSession };
