import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { overlayGlassPillClassName } from "@/components/card/shell/overlaySurfaceClassNames";
import { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";
import { CardModeToolbar } from "@/features/cardsetview/presentation/web/ui/components/CardModeToolbar";
import { CardZoomControl } from "@/features/cardsetview/presentation/web/ui/components/CardZoomControl";
import { CardSetViewDesktopContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewDesktopContent";
import { CardSetViewMetaPanel } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMetaPanel";
import { CardSetViewMobileContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMobileContent";
import { CardSetViewOverlayControls } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewOverlayControls";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";
import type { PresentationTarget } from "@/platform/presentation/getPresentationTarget";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import { cn } from "@/lib/utils";

const CARD_SET_VIEW_CONTENT_COMPONENTS = {
  desktop: CardSetViewDesktopContent,
  mobile: CardSetViewMobileContent,
} satisfies Record<
  PresentationTarget,
  (props: CardSetViewContentProps) => React.JSX.Element
>;

export const CardSetViewScreen = () => {
  const controller = useCardSetViewScreenController();
  const {
    cardSetId,
    settings,
    data,
    state,
    paneWidth,
    widthControl,
    overlayRight,
    resolvedLastSyncedAtMs,
    topLeftZoomControl,
    effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    handleChangeCardLayoutMode,
  } = controller;

  const presentationTarget = usePresentationTarget();

  if (!cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">カードセットが指定されていません</p>
      </div>
    );
  }

  const isDesktopPresentation = presentationTarget === "desktop";
  const Content = CARD_SET_VIEW_CONTENT_COMPONENTS[presentationTarget];
  const desktopOverlayTopInsetPx = getAppTopInsetPx({ presentationTarget });

  const overlayChildren = (
    <CardSetViewOverlayControls
      isDesktop={isDesktopPresentation}
      overlayRight={overlayRight}
      resolvedLastSyncedAtMs={resolvedLastSyncedAtMs}
      activeSyncStatus={state.activeSyncStatus}
      onRetryActiveSync={state.handleRetryActiveSync}
      topInsetPx={desktopOverlayTopInsetPx}
    />
  );

  const modeToolbar = (
    <CardModeToolbar
      displayMode={state.currentDisplayMode}
      cardLayoutMode={effectiveCardLayoutMode}
      disabledCardLayoutModes={disabledCardLayoutModes}
      onChangeDisplayMode={state.setCurrentDisplayMode}
      onChangeCardLayoutMode={handleChangeCardLayoutMode}
    />
  );

  const topLeftControl = (
    <div className="flex items-center gap-2">
      {modeToolbar}
      {topLeftZoomControl ? (
        <CardZoomControl
          value={topLeftZoomControl.value}
          min={topLeftZoomControl.min}
          max={topLeftZoomControl.max}
          step={topLeftZoomControl.step}
          onChange={topLeftZoomControl.onChange}
          onStepDown={topLeftZoomControl.onStepDown}
          onStepUp={topLeftZoomControl.onStepUp}
        />
      ) : null}
      {layoutConstraintIndicatorLabel ? (
        <div
          className={cn(
            overlayGlassPillClassName,
            "text-[11px] font-semibold text-slate-600",
          )}
        >
          {layoutConstraintIndicatorLabel}
        </div>
      ) : null}
    </div>
  );

  return (
    <CardWorkspaceShell
      containerClassName="h-full overflow-hidden bg-[#F5F7F8] pt-0 card-editor-right-pane-font"
      shellClassName="h-full"
      widthControl={widthControl}
      widthControlClassName="hidden md:flex"
      topLeftControl={topLeftControl}
      overlayChildren={overlayChildren}
      overlayTopInsetPx={desktopOverlayTopInsetPx}
      isMetaOpen={state.isMetaOpen}
      onToggleMetaOpen={() => state.setIsMetaOpen((prev) => !prev)}
      metaToggleClassName="hidden md:grid"
      viewportRef={paneWidth.contentViewportRef}
      viewportClassName={
        state.isGlobalEditing || isDesktopPresentation
          ? "px-0 py-0"
          : "px-4 py-0"
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
      <Content controller={controller} />
    </CardWorkspaceShell>
  );
};
