import React from "react";
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import { DEFAULT_LAYOUT_ROWS } from "@/domain/card/extraRows";
import { type CardSetViewEditingDraftPatch, subscribeCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import { applyEditingDraftPatch, buildCardsById, createMetaPanelActions, resolveSelectedCardSnapshot } from "./cardEditorPaneControllerCore";
import { createSelectionCaptureImageAsset } from "@/features/selection-capture/createSelectionCaptureImageAsset";
import { CARD_SELECTION_CAPTURE_EVENT, type CardSelectionCaptureEventDetail } from "@/features/selection-capture/cardSelectionCaptureEvents";
import { useToast } from "@/contexts/ToastContext";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useCards } from "@/components/card/hooks/useCards";
import { useTags } from "@/features/settings/hooks/useTags";
import { useUserSettings } from "@/features/settings/hooks/useUserSettings";
import type { Card, CardBlock, CardPatch, UserSettings } from "@/types";


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

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const normalizeOcrText = (text: string | null): string | null => {
  const normalized = text?.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const createCaptureImageBlock = ({
  side,
  image,
  insertIndex,
}: {
  side: "question" | "answer";
  image: Awaited<ReturnType<typeof createSelectionCaptureImageAsset>>;
  insertIndex: number;
}): CardBlock => ({
  id: `${side}-image-capture-${uid()}`,
  type: "image",
  images: [image],
  audios: [],
  content: "",
  rowOffset: 0,
  orderIndex: insertIndex,
});

const createCaptureTextBlock = ({
  side,
  text,
  insertIndex,
}: {
  side: "question" | "answer";
  text: string;
  insertIndex: number;
}): CardBlock => ({
  id: `${side}-text-capture-${uid()}`,
  type: "text",
  content: text,
  images: [],
  audios: [],
  rowOffset: 0,
  orderIndex: insertIndex,
});

const appendCaptureBlocks = ({
  blocks,
  side,
  image,
  ocrText,
}: {
  blocks: CardBlock[];
  side: "question" | "answer";
  image: Awaited<ReturnType<typeof createSelectionCaptureImageAsset>>;
  ocrText: string | null;
}): CardBlock[] => {
  const nextBlocks = [...blocks];
  nextBlocks.push(createCaptureImageBlock({ side, image, insertIndex: nextBlocks.length }));

  const normalizedOcrText = normalizeOcrText(ocrText);
  if (normalizedOcrText) {
    nextBlocks.push(createCaptureTextBlock({ side, text: normalizedOcrText, insertIndex: nextBlocks.length }));
  }

  return nextBlocks.map((block, index) => ({ ...block, orderIndex: index }));
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
  const { currentUser } = useAuthSession();
  const { success: toastSuccess, error: toastError } = useToast();
  const { tags, tagById, addTag } = useTags();
  void tags;
  const {
    cards: cardsFromHook,
    updateCard,
    createCard,
  } = useCards(folderId, cardSetId, {
    enabled: cardsOverride == null,
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
    async (data: Partial<Card>): Promise<unknown> => {
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
                frontBlocks: appendCaptureBlocks({
                  blocks: prev.frontBlocks,
                  side: detail.side,
                  image,
                  ocrText: detail.ocrText,
                }),
              };
            }

            return {
              ...prev,
              backBlocks: appendCaptureBlocks({
                blocks: prev.backBlocks,
                side: detail.side,
                image,
                ocrText: detail.ocrText,
              }),
            };
          });

          return normalizeOcrText(detail.ocrText)
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
