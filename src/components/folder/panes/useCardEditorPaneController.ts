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

export function useCardEditorPaneController({
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
}: UseCardEditorPaneControllerParams) {
  const { settings: settingsFromHook, updateSettings } = useUserSettings();
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
  const selectedCardSnapshot = React.useMemo(() => {
    if (!selectedCardId) return null;
    return cards.find((card) => card.id === selectedCardId) ?? null;
  }, [cards, selectedCardId]);

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
    window.localStorage.setItem(META_PANEL_OPEN_STORAGE_KEY, String(isMetaOpen));
  }, [isMetaOpen]);

  const resetDialogsRef = React.useRef<() => void>(() => {});

  const session = useCardEditorSession({
    selectedCardId,
    selectedCardSnapshot,
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

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<EditingDraftPatchDetail>)?.detail;
      if (!detail || !session.selectedCard || !session.isEditing) return;
      if (detail.cardId !== session.selectedCard.id) return;

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

      session.setDraft((prev) => {
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
  }, [session]);

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
    session.handleCancel();
    onRequestCloseEditing?.();
  }, [onRequestCloseEditing, session]);

  const handleSaveEditing = React.useCallback(async (): Promise<boolean> => {
    const saved = await session.handleSave();
    if (saved) {
      onRequestCloseEditing?.();
    }
    return saved;
  }, [onRequestCloseEditing, session]);

  const dispatchCardViewSaveFinished = React.useCallback((saved: boolean) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent(CARDVIEW_SAVE_FINISHED_EVENT, { detail: { saved } }),
    );
  }, []);

  const prevSaveSignalRef = React.useRef<number | undefined>(saveSignal);
  React.useEffect(() => {
    if (!saveSignalEnabled) return;
    if (saveSignal == null) return;
    if (prevSaveSignalRef.current === saveSignal) return;
    prevSaveSignalRef.current = saveSignal;

    if (!session.isEditing) {
      dispatchCardViewSaveFinished(true);
      return;
    }
    if (session.isSaving) return;

    void (async () => {
      const saved = await session.handleSave();
      dispatchCardViewSaveFinished(saved);
    })();
  }, [dispatchCardViewSaveFinished, saveSignal, saveSignalEnabled, session]);

  const onAddReviewLog = React.useCallback(
    ({ reviewedAt, rating, durationMinutes }) => {
      const selectedCard = session.selectedCard;
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
    [onCardUpdated, session.selectedCard, settings?.delayBonusEnabled, updateCard],
  );

  const onUpdateLatestReviewLog = React.useCallback(
    ({ reviewLogs, reviewedAt, rating, durationMinutes }) => {
      const selectedCard = session.selectedCard;
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
      session.selectedCard,
      settings?.delayBonusEnabled,
      settings?.reviewStartNextDay,
      updateCard,
    ],
  );

  const onDeleteLatestReviewLog = React.useCallback(
    ({ reviewLogs }) => {
      const selectedCard = session.selectedCard;
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
      session.selectedCard,
      settings?.delayBonusEnabled,
      settings?.reviewStartNextDay,
      updateCard,
    ],
  );

  const onUpdateReviewLogDuration = React.useCallback(
    ({ reviewLogs, logIndex, durationMinutes }) => {
      const selectedCard = session.selectedCard;
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
    [onCardUpdated, session.selectedCard, updateCard],
  );

  const metaPanelActions = React.useMemo(
    () => ({
      onAddReviewLog,
      onUpdateLatestReviewLog,
      onDeleteLatestReviewLog,
      onUpdateReviewLogDuration,
      onTitleInputChange: session.handleTitleInputChange,
      onUpdateTags: session.handleUpdateTags,
      onToggleDraft: session.handleToggleDraft,
      onUpdateTitle: session.handleUpdateTitle,
    }),
    [
      onAddReviewLog,
      onDeleteLatestReviewLog,
      onUpdateLatestReviewLog,
      onUpdateReviewLogDuration,
      session.handleTitleInputChange,
      session.handleToggleDraft,
      session.handleUpdateTags,
      session.handleUpdateTitle,
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
    updateSettings,
    isMetaOpen,
    session,
    layout,
    content,
    actions,
  };
}
