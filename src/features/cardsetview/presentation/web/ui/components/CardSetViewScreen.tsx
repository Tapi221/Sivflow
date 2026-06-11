import type { JSX } from "react";
import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { overlayGlassPillClassName } from "@/components/card/shell/overlaySurfaceClassNames";
import { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";
import { cn } from "@/lib/utils";
import type { PresentationTarget } from "@/platform/presentation/getPresentationTarget";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";
import type { CardSetViewContentProps } from "./cardSetViewContentProps";
import { CardSetViewDesktopContent } from "./CardSetViewDesktopContent";
import { CardSetViewMobileContent } from "./CardSetViewMobileContent";
import { CardViewCompactToolbar } from "./CardViewCompactToolbar";

type CardSetViewScreenProps = {
  cardSetId?: string | null;
};

const CARD_SET_VIEW_CONTENT_COMPONENTS = {
  desktop: CardSetViewDesktopContent,
  mobile: CardSetViewMobileContent,
} satisfies Record<PresentationTarget, (props: CardSetViewContentProps) => JSX.Element>;

export const CardSetViewScreen = ({ cardSetId: controlledCardSetId = null }: CardSetViewScreenProps) => {
  const controller = useCardSetViewScreenController({ cardSetId: controlledCardSetId });
  const { cardSetId, state, paneWidth, topLeftZoomControl, effectiveCardLayoutMode, disabledCardLayoutModes, layoutConstraintIndicatorLabel, handleChangeCardLayoutMode, handleJumpToCard } = controller;
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
  const indexNavigator = state.cardsForPager.length > 0 ? { current: state.safeCurrentIndex + 1, total: state.cardsForPager.length, onCommit: handleJumpToCard } : null;
  const compactToolbar = (
    <CardViewCompactToolbar
      displayMode={state.currentDisplayMode}
      cardLayoutMode={effectiveCardLayoutMode}
      isEditing={state.isGlobalEditing}
      disabledCardLayoutModes={disabledCardLayoutModes}
      onChangeDisplayMode={state.setCurrentDisplayMode}
      onChangeCardLayoutMode={handleChangeCardLayoutMode}
      onToggleEditing={state.handleToggleViewMode}
      indexNavigator={indexNavigator}
      zoom={topLeftZoomControl ? { value: topLeftZoomControl.value, min: topLeftZoomControl.min, max: topLeftZoomControl.max, step: topLeftZoomControl.step, onChange: topLeftZoomControl.onChange } : null}
    />
  );
  const toolbarRight = isDesktopPresentation ? "0.75rem" : "max(0.75rem, env(safe-area-inset-right))";
  const toolbarBottom = isDesktopPresentation ? "1rem" : "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))";
  const overlayChildren = (
    <div className="pointer-events-auto absolute z-20 flex items-end gap-2" style={{ right: toolbarRight, bottom: toolbarBottom }}>
      {layoutConstraintIndicatorLabel ? <div className={cn(overlayGlassPillClassName, "text-[11px] font-semibold text-slate-600")}>{layoutConstraintIndicatorLabel}</div> : null}
      {compactToolbar}
    </div>
  );

  return (
    <CardWorkspaceShell
      containerClassName="h-full overflow-hidden pt-0 card-editor-right-pane-font"
      shellClassName="h-full"
      widthControl={null}
      widthControlClassName="hidden md:flex"
      topLeftControl={null}
      overlayChildren={overlayChildren}
      overlayTopInsetPx={desktopOverlayTopInsetPx}
      isMetaOpen={false}
      viewportRef={paneWidth.contentViewportRef}
      viewportClassName="px-0 py-0"
    >
      <Content controller={controller} />
    </CardWorkspaceShell>
  );
};