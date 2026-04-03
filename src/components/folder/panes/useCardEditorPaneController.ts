import React from "react";

import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";
import { useCards } from "@/hooks/card/useCards";
import { useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { useToast } from "@/contexts/ToastContext";
import {
  createLatestReviewLogPatch,
  createReviewPatchFromRating,
} from "@/services/reviewAlgorithm";
import type { Card, UserSettings } from "@/types";

type UseCardsResult = {
  cards: Card[];
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  createCard: (data: unknown) => unknown;
};

type EditingDraftPatchDetail = {
  cardId: string;
  patch: Partial<Pick<Card, "title" | "isDraft">> & { tags?: string[] };
};

const CARDVIEW_SAVE_FINISHED_EVENT = "cardview:save-finished";
const CARDVIEW_EDITING_DRAFT_PATCH_EVENT = "cardview:editing-draft-patch";
const META_PANEL_OPEN_STORAGE_KEY = "card-editor.meta-panel-open";

type UseCardEditorPaneControllerParams = {
  selectedCardId: string | null;
  folderId?: string;
  cardSetId?: string;
  cardsOverride?: Card[];
  autoEdit?: boolean;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
  onRequestCloseEditing?: () => void;
  settingsOverride?: Partial<UserSettings> | null;
  saveSignal?: number;
  saveSignalEnabled?: boolean;
};

export const useCardEditorPaneController = (
  {
    selectedCardId,
    folderId,
    cardSetId,
    cardsOverride,
    autoEdit,
    onCardUpdated,
    onSelectCardId,
    onRequestCloseEditing,
    settingsOverride,
    saveSignal,
    saveSignalEnabled = true,
  }: UseCardEditorPaneControllerParams
) => {
  const { settings: settingsFromHook } = useUserSettings();
  const settings = settingsOverride ?? settingsFromHook;
  const { success: toastSuccess, error: toastError } = useToast();
  const { tagById, addTag } = useTags();
  const {
    cards: cardsFromHook,
    updateCard,
    createCard,
  } = useCards(folderId, cardSetId, {
    enabled: cardsOverride == null,
  }) as unknown as UseCardsResult;

  const cards = cardsOverride ?? cardsFromHook;
  const cardsById = React.useMemo(() => {
    const map = new Map<string, Card>();
    for (const card of cards) {
      map.set(card.id, card);
    }
    return map;
  }, [cards]);

  const selectedCardSnapshot = React.useMemo(() => {
    if (!selectedCardId) return null;
    return cardsById.get(selectedCardId) ?? null;
  }, [cardsById, selectedCardId]);

  const updateCardAsync = React.useCallback(
    async (id: string, data: Partial<Card>): Promise<unknown> => {
      return await Promise.resolve(updateCard(id, data));
    },
    [updateCard],
  );

  const createCardAsync = React.useCallback(
    async (data: Partial<Card>): Promise<unknown> => {
      return await Promise.resolve(createCard(data));
    },
    [createCard],
  );

  const [isMetaOpen, setIsMetaOpen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(META_PANEL_OPEN_STORAGE_KEY) !== "false";
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      META_PANEL_OPEN_STORAGE_KEY,
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  const resetDialogsRef = React.useRef<() => void>(() => {});

  const session = useCardEditorSession({
    selectedCardId,
    selectedCardSnapshot,
    resolveCardFromEntity: false,
    folderId,
    cardSetId,
    autoEdit,
    updateCard: updateCardAsync,
    createCard: createCardAsync,
    addTag,
    tagById,
    toastSuccess,
    toastError,
    onCardUpdated,
    onSelectCardId,
    resetDialogs: () => resetDialogsRef.current(),
  });

  const {
    selectedCard: sessionSelectedCard,
    isEditing: sessionIsEditing,
    setDraft: setSessionDraft,
    flushDraft,
    handleCancel,
    handleTitleInputChange,
    handleUpdateTags,
    handleToggleDraft,
    handleUpdateTitle,
  } = session;

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditingDraftPatchDetail>)?.detail;
      if (!detail || !sessionSelectedCard || !sessionIsEditing) return;
      if (detail.cardId !== sessionSelectedCard.id) return;

      const nextTitle =
        typeof detail.patch.title === "string" ? detail.patch.title : undefined;
      const nextIsDraft =
        typeof detail.patch.isDraft === "boolean"
          ? detail.patch.isDraft
          : undefined;
      const nextTags = Array.isArray(detail.patch.tags)
        ? detail.patch.tags
        : undefined;

      if (
        nextTitle === undefined &&
        nextIsDraft === undefined &&
        nextTags === undefined
      ) {
        return;
      }

      setSessionDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...(nextTitle !== undefined ? { title: nextTitle } : {}),
          ...(nextIsDraft !== undefined ? { isDraft: nextIsDraft } : {}),
          ...(nextTags !== undefined ? { tags: nextTags } : {}),
        };
      });
    };

    window.addEventListener(CARDVIEW_EDITING_DRAFT_PATCH_EVENT, handler);
    return () =>
      window.removeEventListener(CARDVIEW_EDITING_DRAFT_PATCH_EVENT, handler);
  }, [sessionIsEditing, sessionSelectedCard, setSessionDraft]);

  const layout = useLayoutRowsController({
    draft: session.draft,
    setDraft: session.setDraft,
    defaultLayoutRows: DEFAULT_LAYOUT_ROWS,
    normalizedSelectedCardId: session.normalizedSelectedCardId,
    isEditing: session.isEditing,
  });

  const content = useCardEditorContentController({
    draft: session.draft,
    setDraft: session.setDraft,
    allowAutoMinHeightSyncRef: layout.allowAutoMinHeightSyncRef,
    resetDialogsRef,
  });

  const toggleMetaOpen = React.useCallback(() => {
    setIsMetaOpen((prev) => !prev);
  }, []);

  const handleCancelEditing = React.useCallback(() => {
    handleCancel();
    onRequestCloseEditing?.();
  }, [handleCancel, onRequestCloseEditing]);

  const handleSaveEditing = React.useCallback(async (): Promise<boolean> => {
    const saved = await flushDraft({
      reason: "manual",
      exitEditing: true,
      showSuccessToast: true,
    });
    if (saved) {
      onRequestCloseEditing?.();
    }
    return saved;
  }, [flushDraft, onRequestCloseEditing]);

  const dispatchCardViewSaveFinished = React.useCallback(
    (saved: boolean, detail?: { signal?: number }) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent(CARDVIEW_SAVE_FINISHED_EVENT, {
          detail: { saved, signal: detail?.signal },
        }),
      );
    },
    [],
  );

  const prevSaveSignalRef = React.useRef<number | undefined>(saveSignal);
  React.useEffect(() => {
    if (!saveSignalEnabled) return;
    if (saveSignal == null) return;
    if (prevSaveSignalRef.current === saveSignal) return;
    prevSaveSignalRef.current = saveSignal;

    const eventDetail = {
      signal: saveSignal,
    };

    if (!sessionIsEditing) {
      dispatchCardViewSaveFinished(true, eventDetail);
      return;
    }

    void (async () => {
      const saved = await flushDraft({
        reason: "manual",
        showSuccessToast: false,
      });
      dispatchCardViewSaveFinished(saved, eventDetail);
    })();
  }, [
    dispatchCardViewSaveFinished,
    flushDraft,
    saveSignal,
    saveSignalEnabled,
    sessionIsEditing,
  ]);

  const onAddReviewLog = React.useCallback(
    ({ reviewedAt, rating, durationMinutes }) => {
      const selectedCard = sessionSelectedCard;
      if (!selectedCard?.id) return Promise.resolve();

      const { patch } = createReviewPatchFromRating({
        card: selectedCard,
        rating,
        now: new Date(reviewedAt),
        delayBonusEnabled: settings?.delayBonusEnabled ?? false,
        durationMinutes,
      });

      return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
        onCardUpdated?.();
      });
    },
    [
      onCardUpdated,
      sessionSelectedCard,
      settings?.delayBonusEnabled,
      updateCard,
    ],
  );

  const onUpdateLatestReviewLog = React.useCallback(
    ({ reviewLogs, reviewedAt, rating, durationMinutes }) => {
      const selectedCard = sessionSelectedCard;
      if (!selectedCard?.id) return Promise.resolve();

      const { patch } = createLatestReviewLogPatch({
        action: "update",
        card: selectedCard,
        delayBonusEnabled: settings?.delayBonusEnabled ?? false,
        rating,
        reviewedAt: new Date(reviewedAt),
        reviewLogs,
        reviewStartNextDay: settings?.reviewStartNextDay ?? true,
        durationMinutes,
      });

      return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
        onCardUpdated?.();
      });
    },
    [
      onCardUpdated,
      sessionSelectedCard,
      settings?.delayBonusEnabled,
      settings?.reviewStartNextDay,
      updateCard,
    ],
  );

  const onDeleteLatestReviewLog = React.useCallback(
    ({ reviewLogs }) => {
      const selectedCard = sessionSelectedCard;
      if (!selectedCard?.id) return Promise.resolve();

      const { patch } = createLatestReviewLogPatch({
        action: "delete",
        card: selectedCard,
        delayBonusEnabled: settings?.delayBonusEnabled ?? false,
        reviewLogs,
        reviewStartNextDay: settings?.reviewStartNextDay ?? true,
      });

      return Promise.resolve(updateCard(selectedCard.id, patch)).then(() => {
        onCardUpdated?.();
      });
    },
    [
      onCardUpdated,
      sessionSelectedCard,
      settings?.delayBonusEnabled,
      settings?.reviewStartNextDay,
      updateCard,
    ],
  );

  const onUpdateReviewLogDuration = React.useCallback(
    ({ reviewLogs, logIndex, durationMinutes }) => {
      const selectedCard = sessionSelectedCard;
      if (!selectedCard?.id) return Promise.resolve();

      const nextReviewLogs = reviewLogs.map((log, index) =>
        index === logIndex ? { ...log, durationMinutes } : log,
      );

      return Promise.resolve(
        updateCard(selectedCard.id, {
          reviewLogs: nextReviewLogs,
        }),
      ).then(() => {
        onCardUpdated?.();
      });
    },
    [onCardUpdated, sessionSelectedCard, updateCard],
  );

  const metaPanelActions = React.useMemo(
    () => ({
      onAddReviewLog,
      onUpdateLatestReviewLog,
      onDeleteLatestReviewLog,
      onUpdateReviewLogDuration,
      onFlushAutosave: () =>
        flushDraft({
          reason: "autosave",
          showSuccessToast: false,
        }),
      onTitleInputChange: handleTitleInputChange,
      onUpdateTags: handleUpdateTags,
      onToggleDraft: handleToggleDraft,
      onUpdateTitle: handleUpdateTitle,
    }),
    [
      flushDraft,
      handleTitleInputChange,
      handleToggleDraft,
      handleUpdateTags,
      handleUpdateTitle,
      onAddReviewLog,
      onDeleteLatestReviewLog,
      onUpdateLatestReviewLog,
      onUpdateReviewLogDuration,
    ],
  );

  const actions = React.useMemo(
    () => ({
      toggleMetaOpen,
      handleCancelEditing,
      handleSaveEditing,
      metaPanel: metaPanelActions,
    }),
    [handleCancelEditing, handleSaveEditing, metaPanelActions, toggleMetaOpen],
  );

  return {
    settings,
    isMetaOpen,
    session,
    layout,
    content,
    actions,
  };
};
