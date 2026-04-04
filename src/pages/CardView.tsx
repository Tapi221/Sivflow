import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { CARD_PANE_WIDTH_STEP_PX } from "./card-view/constants";
import { CardViewDesktop } from "./card-view/components/CardViewDesktop";
import { CardViewMetaPanel } from "./card-view/components/CardViewMetaPanel";
import { CardViewMobile } from "./card-view/components/CardViewMobile";
import { useCardViewBreadcrumbs } from "./card-view/hooks/useCardViewBreadcrumbs";
import { useCardViewData } from "./card-view/hooks/useCardViewData";
import { useCardViewPaneWidth } from "./card-view/hooks/useCardViewPaneWidth";
import { useCardViewParams } from "./card-view/hooks/useCardViewParams";
import { useCardViewState } from "./card-view/hooks/useCardViewState";
import { useCardViewWindowEvents } from "./card-view/hooks/useCardViewWindowEvents";

const DISPLAY_MODE_LABELS: Record<CardDisplayMode, string> = {
  fixed: "固定表示（手書き対応）",
  fluid: "読みやすい表示",
};

const DISPLAY_MODE_TRIGGER_LABELS: Record<CardDisplayMode, string> = {
  fixed: "固定表示",
  fluid: "読みやすい",
};

const CardView = () => {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const isDesktop = useIsDesktopRuntime();
  const { settings } = useUserSettings();

  const { folderId, cardSetId, initialIndex, targetCardId } =
    useCardViewParams();

  const data = useCardViewData({ folderId, cardSetId });

  const state = useCardViewState({
    initialIndex,
    targetCardId,
    folderId,
    cardSetId,
    sortedCards: data.sortedCards,
    cardIndexById: data.cardIndexById,
    createCard: data.createCard,
    updateCard: data.updateCard,
    selectedCardSet: data.selectedCardSet,
    isLoading: data.isLoading,
    toastError,
  });

  const {
    contentViewportRef,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneRenderWidthPx,
    activePaneDisplayedDefaultWidthPx,
    previewPaneWidth,
    persistPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  } = useCardViewPaneWidth({
    isGlobalEditing: state.isGlobalEditing,
    isDesktop,
    isMetaOpen: state.isMetaOpen,
    currentIndex: state.currentIndex,
    settings,
    cardSetId,
  });

  useCardViewBreadcrumbs({
    folderId,
    selectedCardSet: data.selectedCardSet,
    selectedCard: state.selectedCard,
    sortedCards: data.sortedCards,
    folders: data.folders,
    setExtraCrumbs,
  });

  useCardViewWindowEvents({
    handleToggleViewMode: state.handleToggleViewMode,
    createAndFocusCard: state.createAndFocusCard,
    isGlobalEditing: state.isGlobalEditing,
    setIsGlobalEditing: state.setIsGlobalEditing,
    requestSave: state.requestSave,
    requestSaveAndLockSelection: state.requestSaveAndLockSelection,
    finishSaveSelectionLock: state.finishSaveSelectionLock,
    pendingExitAfterSaveRef: state.pendingExitAfterSaveRef,
    pendingCreateCardAfterSaveRef: state.pendingCreateCardAfterSaveRef,
  });

  if (!folderId && !cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          フォルダまたはカードセットが指定されていません
        </p>
      </div>
    );
  }

  const showWidthControl = isDesktop;
  const displayModeButtonRight = isDesktop
    ? state.isMetaOpen
      ? "calc(var(--ui-panel-width) + 2.75rem)"
      : "calc(var(--ui-space-1) + 2.75rem)"
    : "0.75rem";

  const widthControl = showWidthControl
    ? {
        modeLabel: state.isGlobalEditing ? "編集幅" : "閲覧幅",
        value: activePaneWidthPx,
        min: activePaneMinWidthPx,
        max: activePaneMaxWidthPx,
        defaultValue: activePaneDisplayedDefaultWidthPx,
        onPreviewChange: (value: number) =>
          previewPaneWidth(activePaneMode, value),
        onCommit: (value: number) => {
          void persistPaneWidth(activePaneMode, value);
        },
        onStepDown: () => stepPaneWidth(-CARD_PANE_WIDTH_STEP_PX),
        onStepUp: () => stepPaneWidth(CARD_PANE_WIDTH_STEP_PX),
        onReset: resetActivePaneWidth,
      }
    : null;

  const displayModeOverlay = cardSetId ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto absolute top-3 z-20 inline-flex h-8 items-center rounded-full bg-[var(--sidebar-bg)] px-3 text-xs font-medium text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
          style={{
            right: displayModeButtonRight,
            transform: "none",
          }}
          aria-label="表示モード"
        >
          {DISPLAY_MODE_TRIGGER_LABELS[state.currentDisplayMode]}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuItem
          onSelect={() => {
            state.setCurrentDisplayMode("fixed");
          }}
        >
          {state.currentDisplayMode === "fixed" ? "● " : "○ "}
          {DISPLAY_MODE_LABELS.fixed}
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            state.setCurrentDisplayMode("fluid");
          }}
        >
          {state.currentDisplayMode === "fluid" ? "● " : "○ "}
          {DISPLAY_MODE_LABELS.fluid}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            void data
              .updateCardSet(cardSetId, {
                defaultDisplayMode: state.currentDisplayMode,
              })
              .catch((error: unknown) => {
                console.error(
                  "[CardView] Failed to save default display mode",
                  error,
                );
                toastError("表示モードの保存に失敗しました");
              });
          }}
        >
          現在の表示をデフォルトにする
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;

  return (
    <CardWorkspaceShell
      containerClassName="h-full overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font"
      shellClassName="h-full"
      widthControl={widthControl}
      widthControlClassName="hidden md:flex"
      overlayChildren={displayModeOverlay}
      isMetaOpen={state.isMetaOpen}
      onToggleMetaOpen={() => state.setIsMetaOpen((prev) => !prev)}
      metaToggleClassName="hidden md:grid"
      viewportRef={contentViewportRef}
      viewportClassName={
        state.isGlobalEditing || isDesktop ? "px-0 py-0" : "px-4 py-0"
      }
      metaPanel={
        <CardViewMetaPanel
          selectedCard={state.selectedCard}
          isGlobalEditing={state.isGlobalEditing}
          settings={settings}
          updateCard={data.updateCard}
        />
      }
    >
      {isDesktop ? (
        <CardViewDesktop
          isLoading={data.isLoading}
          isGlobalEditing={state.isGlobalEditing}
          flippedCardIds={state.flippedCardIds}
          cardsForPager={state.cardsForPager}
          selectedCardId={state.selectedCard?.id ?? null}
          safeCurrentIndex={state.safeCurrentIndex}
          settings={settings}
          editPaneWidthPx={activePaneRenderWidthPx}
          activePaneWidthPx={activePaneRenderWidthPx}
          activePaneMaxWidthPx={activePaneMaxWidthPx}
          currentDisplayMode={state.currentDisplayMode}
          folderId={folderId}
          cardSetId={cardSetId}
          saveSignal={state.saveSignal}
          onActiveIndexChange={state.handlePagerIndexChange}
          onFlip={state.handleFlip}
          onEdit={state.handleEdit}
          onToggleUncertainty={state.handleToggleUncertainty}
          onToggleBookmark={state.handleToggleBookmark}
        />
      ) : (
        <CardViewMobile
          cardsForPager={state.cardsForPager}
          selectedCardId={state.selectedCard?.id ?? null}
          safeCurrentIndex={state.safeCurrentIndex}
          isFlipped={state.isFlipped}
          currentDisplayMode={state.currentDisplayMode}
          settings={settings}
          onIndexChange={state.setCurrentIndex}
          onFlip={state.handleFlip}
          onEdit={state.handleEdit}
          onToggleUncertainty={state.handleToggleUncertainty}
          onToggleBookmark={state.handleToggleBookmark}
        />
      )}
    </CardWorkspaceShell>
  );
};

export default CardView;