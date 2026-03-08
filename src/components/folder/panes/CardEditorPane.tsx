import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "@/ui/icons";

import {
  CardEditorLoadingState,
  EmptySelectionState,
  NewCardIdleState,
} from "@/components/card/editor/CardEditorPaneStates";
import { SharedCardContent } from "@/components/card/common/SharedCardContent";
import {
  CARD_ROW_PX,
  CANONICAL_CARD_WIDTH,
  layoutRowsToCardHeightPx,
} from "@/components/card/common/constants";
import { useCardEditorContentController } from "@/components/card/editor/useCardEditorContentController";
import { LinkEditor } from "@/components/card/editor/LinkEditor";
import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import { useLayoutRowsController } from "@/components/card/editor/useLayoutRowsController";
import { CardCornerActions } from "@/components/card/frame/CardCornerActions";
import { CardFrame } from "@/components/card/frame/CardFrame";
import { Flashcard } from "@/components/card/frame/Flashcard";
import MediaUploader from "@/components/card/media/MediaUploader";
import { CardMetaPanel } from "@/components/card/panels/CardMetaPanel";
import {
  DEFAULT_LAYOUT_ROWS,
  normalizeLayoutRows,
} from "@/domain/card/extraRows";
import { useToast } from "@/contexts/ToastContext";
import { useCards } from "@/hooks/card/useCards";
import { useTags } from "@/hooks/settings/useTags";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Card, UploadedImage } from "@/types";

interface CardEditorPaneProps {
  selectedCardId: string | null;
  folderId?: string;
  autoEdit?: boolean;
  onCardUpdated?: () => void;
  onSelectCardId?: (cardId: string) => void;
}

type UseCardsResult = {
  cards: Card[];
  updateCard: (cardId: string, data: unknown) => void | Promise<void>;
  createCard: (data: unknown) => unknown;
};

type FlashcardCardLike = Record<string, unknown> & {
  id?: string;
  title?: string;
  hasUncertainty?: boolean;
  isBookmarked?: boolean;
};

const toFlashcardCardLike = (card: Card): FlashcardCardLike =>
  card as unknown as FlashcardCardLike;

export function CardEditorPane({
  selectedCardId,
  folderId,
  autoEdit,
  onCardUpdated,
  onSelectCardId,
}: CardEditorPaneProps) {
  const { settings } = useUserSettings();
  const { success: toastSuccess, error: toastError } = useToast();
  const { tagById, addTag } = useTags();
  const {
    cards,
    updateCard,
    createCard,
  } = useCards() as unknown as UseCardsResult;

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

  const [isMetaOpen, setIsMetaOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("card-editor.meta-panel-open") !== "false"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "card-editor.meta-panel-open",
      String(isMetaOpen),
    );
  }, [isMetaOpen]);

  const toolbarMountRefQ = useRef<HTMLDivElement | null>(null);
  const toolbarMountRefA = useRef<HTMLDivElement | null>(null);

  const resetDialogsRef = useRef<() => void>(() => {});

  const {
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
  } = useCardEditorSession({
    selectedCardId,
    folderId,
    autoEdit,
    cards,
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
    allowAutoMinHeightSyncRef,
    manualResizeInProgressRef,
    scheduleLayoutRowsFromHeight,
    handleQuestionMinHeightChange,
    handleAnswerMinHeightChange,
  } = useLayoutRowsController({
    draft,
    setDraft,
    defaultLayoutRows: DEFAULT_LAYOUT_ROWS,
    normalizedSelectedCardId,
    isEditing,
  });

  const {
    onDragEnd,
    setSideBlocks,
    imageDialogSide,
    setImageDialogSide,
    audioDialogSide,
    setAudioDialogSide,
    linkDialogSide,
    setLinkDialogSide,
    renderMediaDialogButtons,
    getDialogImages,
    setDialogImages,
    getDialogAudios,
    setDialogAudios,
    getReferenceItems,
    setReferenceItems,
  } = useCardEditorContentController({
    draft,
    setDraft,
    allowAutoMinHeightSyncRef,
    resetDialogsRef,
  });

  const editorActionsTopLeft = selectedCard ? (
    <CardCornerActions
      onHelp={() => handleToggleUncertainty(selectedCard)}
      onStar={() => handleToggleBookmark(selectedCard)}
      helpActive={selectedCard.hasUncertainty ?? false}
      starActive={selectedCard.isBookmarked ?? false}
    />
  ) : undefined;

  if (!normalizedSelectedCardId && !isEditing) {
    return <EmptySelectionState onStartNew={handleStartNew} />;
  }

  if (isNew && !isEditing) {
    return (
      <NewCardIdleState
        onStartEditing={() => setIsEditing(true)}
        onCancel={handleCancel}
      />
    );
  }

  if (!isNew && normalizedSelectedCardId && !selectedCard && !isEditing) {
    return <CardEditorLoadingState />;
  }

  if (isEditing && !draft) {
    return <CardEditorLoadingState />;
  }

  return (
    <div className="h-full bg-sidebar pb-4 pt-0 card-editor-right-pane-font">
      <div className="relative flex h-full overflow-hidden">
        <button
          type="button"
          className="absolute top-3 z-20 grid h-8 w-8 place-items-center rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
          style={{
            right: isMetaOpen
              ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
              : "var(--ui-space-1)",
            transform: "none",
          }}
          onClick={() => setIsMetaOpen((prev) => !prev)}
          aria-label={isMetaOpen ? "close meta panel" : "open meta panel"}
        >
          {isMetaOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>

        <div
          className="min-w-0 flex-1 overflow-y-auto overflow-x-clip p-4"
          style={{
            background:
              "radial-gradient(1200px 800px at 50% 120px, #FBFAF8 0%, var(--app-bg, #F8FAFB) 50%, #F6F4F1 100%)",
          }}
        >
          {isEditing ? (
            <div className="flex flex-col items-center gap-4">
              <div className="flex w-full items-center justify-end gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-9 rounded-full px-4 hover:bg-black/5 disabled:opacity-50"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    className="h-9 rounded-full bg-black px-6 text-white hover:opacity-90 disabled:opacity-50"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    保存
                  </button>
                </div>
              </div>

              <div className="grid w-fit max-w-full grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="flex min-h-0 w-full flex-col gap-2">
                  <div className="flex shrink-0 justify-center">
                    <div ref={toolbarMountRefQ} />
                  </div>
                  <CardFrame
                    baseWidth={CANONICAL_CARD_WIDTH}
                    contentPaddingPx={0}
                    className={cn("premium-paper-depth", "card-shell--paper")}
                    resizable
                    showResizeHandle
                    resizeStepPx={CARD_ROW_PX}
                    heightPx={layoutRowsToCardHeightPx(
                      normalizeLayoutRows(draft?.layoutRows),
                    )}
                    lockHeight
                    onHeightChange={(heightPx) => {
                      void onDragEnd;
                      scheduleLayoutRowsFromHeight(heightPx);
                    }}
                    onMinHeightChange={handleQuestionMinHeightChange}
                    onResizeStart={() => {
                      manualResizeInProgressRef.current = true;
                    }}
                    onResizeEnd={() => {
                      manualResizeInProgressRef.current = false;
                    }}
                    actionsTopLeft={editorActionsTopLeft}
                    actionsTopRight={renderMediaDialogButtons("question")}
                  >
                    <SharedCardContent
                      mode="edit"
                      blocks={draft?.questionBlocks ?? []}
                      onChange={(blocks) => setSideBlocks("question", blocks)}
                      prefix="question"
                      label="問題"
                      color="text-indigo-500"
                      droppableId="question-blocks"
                      accentColor={settings?.accentColor}
                      duplicateToOpposite={settings?.duplicateToOpposite}
                      toolbarMountRef={toolbarMountRefQ}
                    />
                  </CardFrame>
                </div>

                <div className="flex min-h-0 w-full flex-col gap-2">
                  <div className="flex shrink-0 justify-center">
                    <div ref={toolbarMountRefA} />
                  </div>
                  <CardFrame
                    baseWidth={CANONICAL_CARD_WIDTH}
                    contentPaddingPx={0}
                    className={cn("premium-paper-depth", "card-shell--paper")}
                    resizable
                    showResizeHandle
                    resizeStepPx={CARD_ROW_PX}
                    heightPx={layoutRowsToCardHeightPx(
                      normalizeLayoutRows(draft?.layoutRows),
                    )}
                    lockHeight
                    onHeightChange={(heightPx) => {
                      void onDragEnd;
                      scheduleLayoutRowsFromHeight(heightPx);
                    }}
                    onMinHeightChange={handleAnswerMinHeightChange}
                    onResizeStart={() => {
                      manualResizeInProgressRef.current = true;
                    }}
                    onResizeEnd={() => {
                      manualResizeInProgressRef.current = false;
                    }}
                    actionsTopLeft={editorActionsTopLeft}
                    actionsTopRight={renderMediaDialogButtons("answer")}
                  >
                    <SharedCardContent
                      mode="edit"
                      blocks={draft?.answerBlocks ?? []}
                      onChange={(blocks) => setSideBlocks("answer", blocks)}
                      prefix="answer"
                      label="解答"
                      color="text-emerald-500"
                      droppableId="answer-blocks"
                      accentColor={settings?.accentColor}
                      duplicateToOpposite={settings?.duplicateToOpposite}
                      toolbarMountRef={toolbarMountRefA}
                    />
                  </CardFrame>
                </div>
              </div>
            </div>
          ) : (
            selectedCard && (
              <Flashcard
                card={toFlashcardCardLike(selectedCard)}
                isFlipped={isFlipped}
                onFlip={() => setIsFlipped((prev) => !prev)}
                onToggleBookmark={(cardLike) => {
                  if (!selectedCard) return;
                  void cardLike;
                  void handleToggleBookmark(selectedCard);
                }}
                onToggleUncertainty={(cardLike) => {
                  if (!selectedCard) return;
                  void cardLike;
                  void handleToggleUncertainty(selectedCard);
                }}
                onEdit={() => {
                  setIsFlipped(false);
                  setIsEditing(true);
                }}
              />
            )
          )}
        </div>

        {isMetaOpen && (
          <CardMetaPanel
            card={panelCard}
            reviewLogs={panelCard?.reviewLogs ?? []}
            onUpdateTags={handleUpdateTags}
            onToggleDraft={handleToggleDraft}
            onUpdateTitle={handleUpdateTitle}
          />
        )}
      </div>

      <Dialog
        modal={false}
        open={Boolean(imageDialogSide)}
        onOpenChange={(open) => !open && setImageDialogSide(null)}
      >
        <DialogContent nonModal className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>画像を追加</DialogTitle>
          </DialogHeader>
          {imageDialogSide && (
            <MediaUploader
              type="image"
              urls={getDialogImages(imageDialogSide)}
              onChange={(next) =>
                setDialogImages(imageDialogSide, next as UploadedImage[])
              }
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(audioDialogSide)}
        onOpenChange={(open) => !open && setAudioDialogSide(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>音声を追加</DialogTitle>
          </DialogHeader>
          {audioDialogSide && (
            <MediaUploader
              type="audio"
              urls={getDialogAudios(audioDialogSide)}
              onChange={(next) =>
                setDialogAudios(audioDialogSide, next as unknown[])
              }
              maxFiles={10}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(linkDialogSide)}
        onOpenChange={(open) => !open && setLinkDialogSide(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>リンクを追加</DialogTitle>
          </DialogHeader>
          {linkDialogSide && (
            <LinkEditor
              items={getReferenceItems(linkDialogSide)}
              onChange={(next) => setReferenceItems(linkDialogSide, next)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}





