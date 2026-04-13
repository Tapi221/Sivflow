import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";
import { CardZoomControl } from "@/features/cardsetview/presentation/web/ui/components/CardZoomControl";
import { CardSetViewDesktopContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewDesktopContent";
import { CardSetViewMetaPanel } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMetaPanel";
import { CardSetViewMobileContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMobileContent";
import { CardSetViewOverlayControls } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewOverlayControls";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";
import {
  getPresentationTarget,
  type PresentationTarget,
} from "@/platform/presentation/getPresentationTarget";
import { getRuntimeKind } from "@/platform/runtimeKind";

const TITLEBAR_HEIGHT_PX = 36;

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
    folderId,
    cardSetId,
    settings,
    data,
    state,
    paneWidth,
    widthControl,
    overlayRight,
    resolvedLastSyncedAtMs,
    topLeftZoomControl,
    handleSaveCurrentDisplayMode,
  } = controller;

  if (!folderId && !cardSetId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">
          フォルダまたはカードセットが指定されていません
        </p>
      </div>
    );
  }

  const presentationTarget = getPresentationTarget({
    runtimeKind: getRuntimeKind(),
  });
  const isDesktopPresentation = presentationTarget === "desktop";
  const Content = CARD_SET_VIEW_CONTENT_COMPONENTS[presentationTarget];
  const desktopOverlayTopInsetPx = isDesktopPresentation
    ? TITLEBAR_HEIGHT_PX
    : 0;

  const overlayChildren = (
    <CardSetViewOverlayControls
      isDesktop={isDesktopPresentation}
      overlayRight={overlayRight}
      currentDisplayMode={state.currentDisplayMode}
      cardSetId={cardSetId}
      resolvedLastSyncedAtMs={resolvedLastSyncedAtMs}
      activeSyncStatus={state.activeSyncStatus}
      onRetryActiveSync={state.handleRetryActiveSync}
      onChangeDisplayMode={state.setCurrentDisplayMode}
      onSaveCurrentDisplayMode={handleSaveCurrentDisplayMode}
      topInsetPx={desktopOverlayTopInsetPx}
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
