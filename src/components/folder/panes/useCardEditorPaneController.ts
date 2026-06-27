import React from "react";
import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useCardEditorTags } from "@/components/card/editor/useCardEditorTags";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import { useCards } from "@/components/card/hooks/useCards";
import { applyEditingDraftPatch, buildCardsById, createMetaPanelActions, resolveSelectedCardSnapshot } from "./cardEditorPaneControllerCore";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useToast } from "@/contexts/ToastContext";
import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";
import { CARD_SET_VIEW_EVENTS } from "@/features/cardsetview/events/cardSetViewEvents.constants";
import type { CardSetViewEditingDraftPatch } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { subscribeCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { appendSelectionCaptureBlocks, normalizeSelectionCaptureOcrText } from "@/features/selection-capture/applyCardSelectionCapture";
import type { CardSelectionCaptureEventDetail } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { CARD_SELECTION_CAPTURE_EVENT } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { createSelectionCaptureImageAsset } from "@/features/selection-capture/createSelectionCaptureImageAsset";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { Card, CardPatch, UserSettings } from "@/types";



type UseCardsResult = {
  cards: Card[];
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  createCard: (data: unknown) => unknown;
};
type CreateCardPayload = CardPatch & {
  folderId: string;
  cardSetId?: string;
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



const useCardEditorPaneController = ({ selectedCardId, folderId, cardSetId, cardsOverride, autoEdit, onCardUpdated, onSelectCardId, settingsOverride }: UseCardEditorPaneControllerParams) => {
  const { settings: settingsFromHook } = useUserSettings();
  const settings = settingsOverride ?? settingsFromHook;
  const { currentUser } = useAuthSession();
  const { success: toastSuccess, error: toastError } = useToast();
  const { tags, tagById, addTag } = useCardEditorTags();
  void tags;
  const {
    cards: cardsFromHook,
    updateCard,
    createCard,
  } = useCards(folderId, cardSetId, {
    enabled: (cardsOverride === null || cardsOverride === undefined),
  }) as unknown as UseCardsResult;

  const cards = cardsOverride ?? cardsFromHook;
  const isMetaOpen = false;
  const toggleMetaOpen: (() => void) | undefined = undefined;

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
    async (data: CreateCardPayload): Promise<unknown> => {
      return await Promise.resolve(createCard(data));
    },
    [createCard],
  );

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
    const handleSelectionCapture = (event: Event) => {
      const captureEvent = event as CustomEvent<CardSelectionCaptureEventDetail>;
      const detail = captureEvent.detail;
      if (!detail || !sessionIsEditing) return;
      if (!currentUser?.uid) {
        toastError?.("ログイン状態を確認できないため、範囲をカードへ保存できませんでした");
        return;
      }

      captureEvent.preventDefault();
      detail.addTask(
        (async () => {
          const image = await createSelectionCaptureImageAsset({
            blob: detail.blob,
            userId: currentUser.uid,
          });

          setSessionDraft((prev) => {
            if (!prev) return prev;
            if (detail.side === "question") {
              return {
                ...prev,
                frontBlocks: appendSelectionCaptureBlocks({
                  blocks: prev.frontBlocks,
                  side: detail.side,
                  image,
                  ocrText: detail.ocrText,
                }),
              };
            }

            return {
              ...prev,
              backBlocks: appendSelectionCaptureBlocks({
                blocks: prev.backBlocks,
                side: detail.side,
                image,
                ocrText: detail.ocrText,
              }),
            };
          });

          return normalizeSelectionCaptureOcrText(detail.ocrText)
            ? "範囲画像とOCRテキストをカードへ追加しました"
            : "範囲画像をカードへ追加しました";
        })(),
      );
    };

    document.addEventListener(CARD_SELECTION_CAPTURE_EVENT, handleSelectionCapture);
    return () => {
      document.removeEventListener(CARD_SELECTION_CAPTURE_EVENT, handleSelectionCapture);
    };
  }, [currentUser?.uid, sessionIsEditing, setSessionDraft, toastError]);

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



export { useCardEditorPaneController };
