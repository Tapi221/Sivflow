import { useEffect } from "react";

import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";

import { ExportMfCardButton } from "@/features/cardFile/presentation/web/ExportMfCardButton";
import { dispatchCardSetViewWindowEvent } from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";
import { useCardSetViewScreenController } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewScreenController";
import type { CardSetViewContentProps } from "@/features/cardsetview/presentation/web/ui/components/cardSetViewContentProps";
import { CardSetViewDesktopContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewDesktopContent";
import { CardSetViewMetaPanel } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMetaPanel";
import { CardSetViewMobileContent } from "@/features/cardsetview/presentation/web/ui/components/CardSetViewMobileContent";
import { CardViewCompactToolbar } from "@/features/cardsetview/presentation/web/ui/components/CardViewCompactToolbar";
import { ExportMfDeckButton } from "@/features/deckFile/presentation/web/ExportMfDeckButton";

import { CardWorkspaceShell } from "@/components/card/shell/CardWorkspaceShell";
import { overlayGlassPillClassName } from "@/components/card/shell/overlaySurfaceClassNames";

import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import type { PresentationTarget } from "@/platform/presentation/getPresentationTarget";
import { getAppTopInsetPx } from "@/platform/presentation/shellMetrics";
import { usePresentationTarget } from "@/platform/presentation/usePresentationTarget";

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
    topLeftZoomControl,
    effectiveCardLayoutMode,
    disabledCardLayoutModes,
    layoutConstraintIndicatorLabel,
    handleChangeCardLayoutMode,
    handleJumpToCard,
  } = controller;
  const { tagById } = useTags();

  const presentationTarget = usePresentationTarget();

  useEffect(() => {
    if (!cardSetId) {
      return;
    }

    dispatchCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.metaOpenChange,
      state.isMetaOpen,
    );

    return () => {
      dispatchCardSetViewWindowEvent(
        CARD_SET_VIEW_EVENTS.metaOpenChange,
        false,
      );
    };
  }, [cardSetId, state.isMetaOpen]);

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
  const indexNavigator =
    state.cardsForPager.length > 0
      ? {
        current: state.safeCurrentIndex + 1,
        total: state.cardsForPager.length,
        onCommit: handleJumpToCard,
      }
      : null;

  const compactToolbar = (
    <CardViewCompactToolbar
      displayMode={state.currentDisplayMode}
      cardLayoutMode={effectiveCardLayoutMode}
      disabledCardLayoutModes={disabledCardLayoutModes}
      onChangeDisplayMode={state.setCurrentDisplayMode}
      onChangeCardLayoutMode={handleChangeCardLayoutMode}
      indexNavigator={indexNavigator}
      zoom={
        topLeftZoomControl
          ? {
            value: topLeftZoomControl.value,
            min: topLeftZoomControl.min,
            max: topLeftZoomControl.max,
            step: topLeftZoomControl.step,
            onChange: topLeftZoomControl.onChange,
          }
          : null
      }
    />
  );

  const toolbarRight = isDesktopPresentation
    ? state.isMetaOpen
      ? "calc(var(--ui-panel-width) + 0.75rem)"
      : "0.75rem"
    : "max(0.75rem, env(safe-area-inset-right))";

  const toolbarBottom = isDesktopPresentation
    ? "1rem"
    : "max(1rem, calc(env(safe-area-inset-bottom) + 0.5rem))";

  const overlayChildren = (
    <>
      <div
        className="pointer-events-auto absolute z-20 flex items-end gap-2"
        style={{
          right: toolbarRight,
          bottom: toolbarBottom,
        }}
      >
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

        {compactToolbar}
      </div>
    </>
  );

  const topLeftControl = data.selectedCardSet ? (
    <div className="flex flex-wrap items-center gap-2">
      <ExportMfDeckButton
        cardSet={data.selectedCardSet}
        cards={data.sortedCards}
        tagById={tagById}
        disabled={data.isLoading}
      />
      <ExportMfCardButton
        card={state.selectedCard}
        tagById={tagById}
        disabled={data.isLoading}
      />
    </div>
  ) : null;

  return (
    <CardWorkspaceShell
      containerClassName="h-full overflow-hidden pt-0 card-editor-right-pane-font"
      shellClassName="h-full"
      widthControl={null}
      widthControlClassName="hidden md:flex"
      topLeftControl={topLeftControl}
      overlayChildren={overlayChildren}
      overlayTopInsetPx={desktopOverlayTopInsetPx}
      isMetaOpen={state.isMetaOpen}
      viewportRef={paneWidth.contentViewportRef}
      viewportClassName={
        state.isGlobalEditing || isDesktopPresentation
          ? "px-0 py-0"
          : "px-4 py-0"
      }
      metaPanel={
        <CardSetViewMetaPanel
          isLoading={data.isLoading}
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
