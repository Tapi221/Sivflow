import React from "react";

import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import {
  applyEditingDraftPatch,
  buildCardsById,
  createMetaPanelActions,
  readStoredMetaPanelOpen,
  resolveSelectedCardSnapshot,
  writeStoredMetaPanelOpen,
} from "@/components/folder/panes/cardEditorPaneControllerCore";
import { useToast } from "@/contexts/ToastContext";
import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import {
  subscribeCardSetViewWindowEvent,
  type CardSetViewEditingDraftPatch,
} from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { useCards } from "@/hooks/card/useCards";
import { useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { Card, CardPatch, UserSettings } from "@/types";

type UseCardsResult = {
  cards: Card[];
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  createCard: (data: unknown) => unknown;
};

type UseCardEditorPaneControllerParams = {
  selectedCardId: string | null;
  folderId?: string;
  cardSetId?: string;
  cardsOverride?: Card[];
  autoEdit?: boolean;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
  settingsOverride?: Partial<UserSettings> | null;
};

export const useCardEditorPaneController = ({
  selectedCardId,
  folderId,
  cardSetId,
  cardsOverride,
  autoEdit,
  onCardUpdated,
  onSelectCardId,
  settingsOverride,
}: UseCardEditorPaneControllerParams) => {
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

  const cardsById = React.useMemo(() => buildCardsById(cards), [cards]);

  const selectedCardSnapshot = React.useMemo(
    () =>
      resolveSelectedCardSnapshot({
        selectedCardId,
        cardsById,
      }),
    [cardsById, selectedCardId],
  );

  const updateCardAsync = React.useCallback(
    async (id: string, data: CardPatch): Promise<unknown> => {
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

  const [isMetaOpen, setIsMetaOpen] = React.useState<boolean>(() =>
    readStoredMetaPanelOpen(),
  );

  React.useEffect(() => {
    writeStoredMetaPanelOpen(isMetaOpen);
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
    handleTitleInputChange,
    handleUpdateTags,
    handleToggleDraft,
    handleUpdateTitle,
  } = session;

  React.useEffect(() => {
    return subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.editingDraftPatch,
      (detail: CardSetViewEditingDraftPatch) => {
        setSessionDraft((prev) => {
          const nextDraft = applyEditingDraftPatch({
            currentDraft: prev
              ? {
                  title: prev.title,
                  isDraft: prev.isDraft,
                  tags: prev.tags,
                }
              : null,
            detail,
            selectedCardId: sessionSelectedCard?.id ?? null,
            isEditing: sessionIsEditing,
          });

          if (!prev || !nextDraft) return prev;
          return {
            ...prev,
            title: nextDraft.title,
            isDraft: nextDraft.isDraft,
            tags: nextDraft.tags,
          };
        });
      },
    );
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

  const metaPanelActions = React.useMemo(
    () =>
      createMetaPanelActions({
        selectedCard: sessionSelectedCard,
        settings,
        updateCard,
        onCardUpdated,
        flushDraft,
        handleTitleInputChange,
        handleUpdateTags,
        handleToggleDraft,
        handleUpdateTitle,
      }),
    [
      sessionSelectedCard,
      settings,
      updateCard,
      onCardUpdated,
      flushDraft,
      handleTitleInputChange,
      handleUpdateTags,
      handleToggleDraft,
      handleUpdateTitle,
    ],
  );

  const actions = React.useMemo(
    () => ({
      toggleMetaOpen,
      metaPanel: metaPanelActions,
    }),
    [metaPanelActions, toggleMetaOpen],
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
