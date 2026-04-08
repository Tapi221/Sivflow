import { CardSyncStatusPill } from "@/components/card/shell/CardSyncStatusPill";
import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import type { CardDisplayMode } from "@/types/domain/cardSet";
import { CardSetViewDesktop } from "../pages/card-set-view/components/CardSetViewDesktop";
import { CardSetViewMetaPanel } from "../pages/card-set-view/components/CardSetViewMetaPanel";
import { CardSetViewMobile } from "../pages/card-set-view/components/CardSetViewMobile";
import { CardZoomControl } from "../pages/card-set-view/components/CardZoomControl";
import { useCardSetViewBreadcrumbs } from "../pages/card-set-view/hooks/useCardSetViewBreadcrumbs";
import { useCardSetViewData } from "../pages/card-set-view/hooks/useCardSetViewData";
import { useCardSetViewPaneWidth } from "../pages/card-set-view/hooks/useCardSetViewPaneWidth";
import { useCardSetViewParams } from "../pages/card-set-view/hooks/useCardSetViewParams";
import { useCardSetViewState } from "../pages/card-set-view/hooks/useCardSetViewState";
import { useCardSetViewWindowEvents } from "../pages/card-set-view/hooks/useCardSetViewWindowEvents";
import { useCardSetViewZoom } from "../pages/card-set-view/hooks/useCardSetViewZoom";
import { CARD_PANE_WIDTH_STEP_PX } from "./constants";

const DISPLAY_MODE_LABELS: Record<CardDisplayMode, string> = {
  fixed: "カード表示（手書き対応）",
  fluid: "最大表示",
};

const DISPLAY_MODE_TRIGGER_LABELS: Record<CardDisplayMode, string> = {
  fixed: "カード表示",
  fluid: "最大表示",
};

const toTimeMs = (value: unknown) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const nextDate = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(nextDate.getTime()) ? null : nextDate.getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const nextDate = new Date(value);
    return Number.isNaN(nextDate.getTime()) ? null : nextDate.getTime();
  }

  return null;
};

const CardSetView = () => {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const isDesktop = useIsDesktopRuntime();
  const { settings } = useUserSettings();

  const { folderId, cardSetId, initialIndex, targetCardId } =
    useCardSetViewParams();

  const data = useCardSetViewData({ folderId, cardSetId });

  const state = useCardSetViewState({
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
  } = useCardSetViewPaneWidth({
    isGlobalEditing: state.isGlobalEditing,
    isDesktop,
    isMetaOpen: state.isMetaOpen,
    currentIndex: state.currentIndex,
    settings,
    cardSetId,
  });

  const zoom = useCardSetViewZoom({
    cardSetId,
    viewportRef: contentViewportRef,
    activeCardKey: `${state.selectedCard?.id ?? ""}:${state.currentDisplayMode}`,
  });

  useCardSetViewBreadcrumbs({
    folderId,
    selectedCardSet: data.selectedCardSet,
    selectedCard: state.selectedCard,
    sortedCards: data.sortedCards,
    folders: data.folders,
    setExtraCrumbs,
  });

  useCardSetViewWindowEvents({
    handleToggleViewMode: state.handleToggleViewMode,
    createAndFocusCard: state.createAndFocusCard,
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

  const showEditWidthControl = isDesktop && state.isGlobalEditing;

  const overlayRight = isDesktop
    ? state.isMetaOpen
      ? "calc(var(--ui-panel-width) + 2.75rem)"
      : "calc(var(--ui-space-1) + 2.75rem)"
    : "0.75rem";

  const widthControl = showEditWidthControl
    ? {
        modeLabel: "編集幅",
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

  const resolvedLastSyncedAtMs =
    state.activeSyncStatus?.lastSyncedAtMs ??
    toTimeMs(
      (state.selectedCard as { updatedAt?: unknown } | null)?.updatedAt,
    ) ??
    toTimeMs(
      (state.selectedCard as { createdAt?: unknown } | null)?.createdAt,
    ) ??
    null;

  const displayModeControl = cardSetId ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="pointer-events-auto inline-flex h-8 items-center rounded-full bg-[var(--sidebar-bg)] px-3 text-xs font-medium text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
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
                  "[CardSetView] Failed to save default display mode",
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

  const overlayChildren = isDesktop ? (
    <div
      className="pointer-events-none absolute top-3 z-20 flex items-center gap-2"
      style={{
        right: overlayRight,
        transform: "none",
      }}
    >
      <CardSyncStatusPill
        lastSyncedAtMs={resolvedLastSyncedAtMs}
        hasError={state.activeSyncStatus?.hasError ?? false}
        isRetrying={state.activeSyncStatus?.isRetrying ?? false}
        canRetry={state.activeSyncStatus?.retry != null}
        onRetry={state.handleRetryActiveSync}
      />
      {displayModeControl}
    </div>
  ) : null;

  const topLeftControl =
    isDesktop && !state.isGlobalEditing ? (
      <CardZoomControl
        value={zoom.zoomPercent}
        min={zoom.minZoomPercent}
        max={zoom.maxZoomPercent}
        step={5}
        defaultValue={zoom.defaultZoomPercent}
        onChange={zoom.setZoomPercent}
        onStepDown={zoom.stepDown}
        onStepUp={zoom.stepUp}
        onReset={zoom.reset}
      />
    ) : null;

  return (
    <CardWorkspaceShell
      containerClassName="h-full overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font"
      shellClassName="h-full"
      widthControl={widthControl}
      widthControlClassName="hidden md:flex"
      topLeftControl={topLeftControl}
      overlayChildren={overlayChildren}
      isMetaOpen={state.isMetaOpen}
      onToggleMetaOpen={() => state.setIsMetaOpen((prev) => !prev)}
      metaToggleClassName="hidden md:grid"
      viewportRef={contentViewportRef}
      viewportClassName={
        state.isGlobalEditing || isDesktop ? "px-0 py-0" : "px-4 py-0"
      }
      metaPanel={
        <CardSetViewMetaPanel
          selectedCard={state.selectedCard}
          isGlobalEditing={state.isGlobalEditing}
          settings={settings}
          updateCard={data.updateCard}
        />
      }
    >
      {isDesktop ? (
        <CardSetViewDesktop
          isLoading={data.isLoading}
          isGlobalEditing={state.isGlobalEditing}
          flippedCardIds={state.flippedCardIds}
          cardsForPager={state.cardsForPager}
          selectedCardId={state.selectedCard?.id ?? null}
          safeCurrentIndex={state.safeCurrentIndex}
          settings={settings}
          editPaneWidthPx={activePaneRenderWidthPx}
          currentDisplayMode={state.currentDisplayMode}
          folderId={folderId}
          cardSetId={cardSetId}
          viewZoomScale={zoom.zoomScale}
          fixedCardWidthPx={zoom.fixedCardWidthPx}
          fluidAvailableWidthPx={zoom.availableWidthPx}
          onActiveIndexChange={state.handlePagerIndexChange}
          onFlip={state.handleFlip}
          onToggleUncertainty={state.handleToggleUncertainty}
          onToggleBookmark={state.handleToggleBookmark}
          onSyncStatusChange={state.handleActiveSyncStatusChange}
        />
      ) : (
        <CardSetViewMobile
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

export default CardSetView;
