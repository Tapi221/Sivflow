import { Button } from "@/components/ui/button";
import { useBreadcrumbContext } from "@/contexts/BreadcrumbContext";
import { useToast } from "@/contexts/ToastContext";
import { useIsDesktopRuntime } from "@/hooks/platform/useIsDesktopRuntime";
import { useUserSettings } from "@/hooks/settings/useUserSettings";
import { ChevronLeft, ChevronRight } from "@/ui/icons";
import { useState } from "react";
import { CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX } from "./card-view/constants";
import { CardPaneWidthControl } from "./card-view/components/CardPaneWidthControl";
import { CardViewDesktop, DesktopToolbarRow } from "./card-view/components/CardViewDesktop";
import { CardViewMetaPanel } from "./card-view/components/CardViewMetaPanel";
import { CardViewMobile } from "./card-view/components/CardViewMobile";
import { useCardViewBreadcrumbs } from "./card-view/hooks/useCardViewBreadcrumbs";
import { useCardViewData } from "./card-view/hooks/useCardViewData";
import { useCardViewPaneWidth } from "./card-view/hooks/useCardViewPaneWidth";
import { useCardViewParams } from "./card-view/hooks/useCardViewParams";
import { useCardViewState } from "./card-view/hooks/useCardViewState";
import { useCardViewWindowEvents } from "./card-view/hooks/useCardViewWindowEvents";

export default function CardView() {
  const { setExtraCrumbs } = useBreadcrumbContext();
  const { error: toastError } = useToast();
  const isDesktop = useIsDesktopRuntime();
  const { settings, updateSettings } = useUserSettings();

  const { folderId, cardSetId, initialIndex, targetCardId } = useCardViewParams();

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

  const paneWidth = useCardViewPaneWidth({
    isGlobalEditing: state.isGlobalEditing,
    isDesktop,
    isMetaOpen: state.isMetaOpen,
    currentIndex: state.currentIndex,
    settings,
    updateSettings,
  });

  useCardViewBreadcrumbs({
    folderId,
    selectedCardSet: data.selectedCardSet,
    selectedCard: state.selectedCard,
    folders: data.folders,
    setExtraCrumbs,
  });

  useCardViewWindowEvents({
    handleToggleViewMode: state.handleToggleViewMode,
    createAndFocusCard: state.createAndFocusCard,
    isGlobalEditing: state.isGlobalEditing,
    setIsGlobalEditing: state.setIsGlobalEditing,
    setSaveSignal: state.setSaveSignal,
    pendingExitAfterSaveRef: state.pendingExitAfterSaveRef,
    pendingCreateCardAfterSaveRef: state.pendingCreateCardAfterSaveRef,
  });

  // Toolbar mount refs for CardEditorPane's external toolbar portals
  const [globalToolbarMountQ, setGlobalToolbarMountQ] =
    useState<HTMLDivElement | null>(null);
  const [globalToolbarMountA, setGlobalToolbarMountA] =
    useState<HTMLDivElement | null>(null);

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
  const shouldReserveWidthControlSpace =
    showWidthControl && state.isGlobalEditing;

  return (
    <div className="h-full overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font">
      <div className="relative flex h-full min-h-0 overflow-hidden">
        {showWidthControl && (
          <div className="pointer-events-none absolute left-3 top-3 z-30 hidden md:flex">
            <CardPaneWidthControl
              modeLabel={state.isGlobalEditing ? "編集幅" : "閲覧幅"}
              value={paneWidth.activePaneWidthPx}
              min={paneWidth.activePaneMinWidthPx}
              max={paneWidth.activePaneMaxWidthPx}
              defaultValue={paneWidth.activePaneDisplayedDefaultWidthPx}
              onPreviewChange={(value) =>
                paneWidth.previewPaneWidth(paneWidth.activePaneMode, value)
              }
              onCommit={(value) => {
                void paneWidth.persistPaneWidth(paneWidth.activePaneMode, value);
              }}
              onStepDown={() => paneWidth.stepPaneWidth(-CARD_PANE_WIDTH_STEP_PX)}
              onStepUp={() => paneWidth.stepPaneWidth(CARD_PANE_WIDTH_STEP_PX)}
              onReset={paneWidth.resetActivePaneWidth}
            />
          </div>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden md:flex absolute top-3 z-20 h-8 w-8 rounded-full bg-[var(--sidebar-bg)] text-[#334155] surface-control-convex hover:bg-[var(--sidebar-active-bg)]"
          style={{
            right: state.isMetaOpen
              ? "calc(var(--ui-panel-width) - var(--ui-space-3))"
              : "var(--ui-space-1)",
            transform: "none",
          }}
          onClick={() => state.setIsMetaOpen((prev) => !prev)}
          aria-label={state.isMetaOpen ? "close meta panel" : "open meta panel"}
        >
          {state.isMetaOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>

        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          style={
            shouldReserveWidthControlSpace
              ? { paddingTop: CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX }
              : undefined
          }
        >
          {isDesktop && state.isGlobalEditing && (
            <DesktopToolbarRow
              isGlobalEditing={state.isGlobalEditing}
              editPaneWidthPx={paneWidth.editPaneWidthPx}
              setGlobalToolbarMountQ={setGlobalToolbarMountQ}
              setGlobalToolbarMountA={setGlobalToolbarMountA}
            />
          )}

          <div
            ref={paneWidth.contentViewportRef}
            className={`min-h-0 min-w-0 flex-1 overflow-hidden py-0 ${
              state.isGlobalEditing ? "px-0" : "px-4"
            }`}
          >
            {isDesktop ? (
              <CardViewDesktop
                isLoading={data.isLoading}
                isGlobalEditing={state.isGlobalEditing}
                isFlipped={state.isFlipped}
                cardsForPager={state.cardsForPager}
                safeCurrentIndex={state.safeCurrentIndex}
                editPaneWidthPx={paneWidth.editPaneWidthPx}
                activePaneWidthPx={paneWidth.activePaneWidthPx}
                folderId={folderId}
                cardSetId={cardSetId}
                saveSignal={state.saveSignal}
                onActiveIndexChange={state.handlePagerIndexChange}
                onFlip={state.handleFlip}
                onEdit={state.handleEdit}
                onToggleUncertainty={state.handleToggleUncertainty}
                onToggleBookmark={state.handleToggleBookmark}
                globalToolbarMountQ={globalToolbarMountQ}
                globalToolbarMountA={globalToolbarMountA}
              />
            ) : (
              <CardViewMobile
                cardsForPager={state.cardsForPager}
                safeCurrentIndex={state.safeCurrentIndex}
                isFlipped={state.isFlipped}
                settings={settings}
                onIndexChange={state.setCurrentIndex}
                onFlip={state.handleFlip}
                onEdit={state.handleEdit}
                onToggleUncertainty={state.handleToggleUncertainty}
                onToggleBookmark={state.handleToggleBookmark}
              />
            )}
          </div>
        </div>

        {state.isMetaOpen && (
          <div className="hidden h-full min-h-0 shrink-0 md:block">
            <CardViewMetaPanel
              selectedCard={state.selectedCard}
              settings={settings}
              updateCard={data.updateCard}
            />
          </div>
        )}
      </div>
    </div>
  );
}
