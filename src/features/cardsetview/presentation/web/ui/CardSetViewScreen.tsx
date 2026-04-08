import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { useToast } from "@/contexts/ToastContext";
import { saveDefaultDisplayMode } from "@/features/cardsetview/application/cardSetViewUseCases";
import { CardZoomControl } from "@/features/cardsetview/presentation/web/ui/components/CardZoomControl";
import { CardSetViewDesktop } from "@/features/cardsetview/presentation/web/ui/CardSetViewDesktop";
import { CardSetViewMetaPanel } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMetaPanel";
import { CardSetViewMobile } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMobile";
import { useCardSetViewScreenController } from "@/features/cardsetview/hooks/useCardSetViewScreenController";
import { CardSetViewOverlayControls } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewOverlayControls";

export const CardSetViewScreen = () => {
  const { error: toastError } = useToast();

  const {
    folderId,
    cardSetId,
    isDesktop,
    settings,
    data,
    state,
    paneWidth,
    zoom,
    widthControl,
    overlayRight,
    resolvedLastSyncedAtMs,
    topLeftZoomControl,
  } = useCardSetViewScreenController();

  if (!folderId && !cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          フォルダまたはカードセットが指定されていません
        </p>
      </div>
    );
  }

  const overlayChildren = (
    <CardSetViewOverlayControls
      isDesktop={isDesktop}
      overlayRight={overlayRight}
      currentDisplayMode={state.currentDisplayMode}
      cardSetId={cardSetId}
      resolvedLastSyncedAtMs={resolvedLastSyncedAtMs}
      activeSyncStatus={state.activeSyncStatus}
      onRetryActiveSync={state.handleRetryActiveSync}
      onChangeDisplayMode={state.setCurrentDisplayMode}
      onSaveCurrentDisplayMode={() => {
        if (!cardSetId) {
          return;
        }

        void saveDefaultDisplayMode({
          cardSetId,
          currentDisplayMode: state.currentDisplayMode,
          updateCardSet: data.updateCardSet,
        }).catch((error: unknown) => {
          console.error(
            "[CardSetView] Failed to save default display mode",
            error,
          );
          toastError("表示モードの保存に失敗しました");
        });
      }}
    />
  );

  const topLeftControl = topLeftZoomControl ? (
    <CardZoomControl
      value={topLeftZoomControl.value}
      min={topLeftZoomControl.min}
      max={topLeftZoomControl.max}
      step={topLeftZoomControl.step}
      defaultValue={topLeftZoomControl.defaultValue}
      onChange={topLeftZoomControl.onChange}
      onStepDown={topLeftZoomControl.onStepDown}
      onStepUp={topLeftZoomControl.onStepUp}
      onReset={topLeftZoomControl.onReset}
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
      viewportRef={paneWidth.contentViewportRef}
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
          editPaneWidthPx={paneWidth.activePaneRenderWidthPx}
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
