import { useMemo } from "react";
import { CARD_PANE_EDIT_MIN_WIDTH_PX, CARD_PANE_EDITOR_DEFAULT_WIDTH_PX, CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX, CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX, clampPaneWidthPx } from "@/components/card/frame/cardPane.constants";
import { useCardPaneWidthState } from "@/components/card/shell/useCardPanewidthState";
import { resolveEditorCardFitScale } from "@/domain/card/resolveEditorCardFitScale";
import type { CardLayoutMode } from "@/features/cardsetview/domain/cardLayoutMode";
import { CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX } from "@/features/cardsetview/domain/cardSetViewPresentation.constants";
import { getCardSetWidthPreference, setCardSetWidthPreference } from "@/services/cardWidthPreferences";
import type { UserSettings } from "@/types";



interface UseCardEditorPaneWidthParams {
  settings?: Partial<UserSettings> | null;
  dockToolbarsToTop: boolean;
  embeddedInPager: boolean;
  hideBlockToolbars: boolean;
  forcedPaneWidthPx: number | null;
  usesExternalToolbarMount: boolean;
  isEditing: boolean;
  isMetaOpen: boolean;
  normalizedSelectedCardId: string | null;
  selectedCardId?: string;
  canonicalCardWidth: number;
  cardSetId?: string | null;
  cardLayoutMode: CardLayoutMode;
}



const CARD_EDITOR_PAIR_GAP_PX = 0;
const CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX =
  CARD_SET_VIEW_SPLIT_MIN_PRESENTATION_WIDTH_PX;



const measureViewportWidth = (element: HTMLDivElement) =>
  Math.max(
    0,
    Math.round(
      Math.max(element.clientWidth, element.parentElement?.clientWidth ?? 0),
    ),
  );
const useCardEditorPaneWidth = ({ settings, dockToolbarsToTop, embeddedInPager, hideBlockToolbars, forcedPaneWidthPx, usesExternalToolbarMount, isEditing, isMetaOpen, normalizedSelectedCardId, selectedCardId, canonicalCardWidth, cardSetId, cardLayoutMode }: UseCardEditorPaneWidthParams) => {
  const defaultSharedPaneWidthPx = dockToolbarsToTop ? CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX : CARD_PANE_EDITOR_DEFAULT_WIDTH_PX;

  const preferenceScopeKey = `${cardSetId ?? ""}:${defaultSharedPaneWidthPx}:${settings?.cardEditPaneWidthPx ?? ""}:${settings?.cardViewPaneWidthPx ?? ""}`;

  const preferredSharedPaneWidthPx = useMemo(() => {
    const localStoredView = cardSetId
      ? getCardSetWidthPreference(cardSetId, "view")
      : undefined;
    const localStoredEdit = cardSetId
      ? getCardSetWidthPreference(cardSetId, "edit")
      : undefined;

    return clampPaneWidthPx(
      localStoredView ??
      localStoredEdit ??
      settings?.cardEditPaneWidthPx ??
      settings?.cardViewPaneWidthPx ??
      defaultSharedPaneWidthPx,
      CARD_PANE_EDIT_MIN_WIDTH_PX,
    );
  }, [
    cardSetId,
    defaultSharedPaneWidthPx,
    settings?.cardEditPaneWidthPx,
    settings?.cardViewPaneWidthPx,
  ]);

  const sharedPreferenceKey = `${preferenceScopeKey}:shared`;

  const {
    contentViewportRef,
    contentViewportWidth,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneDisplayedDefaultWidthPx,
    previewPaneWidth,
    persistPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  } = useCardPaneWidthState({
    isEditMode: isEditing,
    preferredWidths: {
      view: {
        key: sharedPreferenceKey,
        width: preferredSharedPaneWidthPx,
      },
      edit: {
        key: sharedPreferenceKey,
        width: preferredSharedPaneWidthPx,
      },
    },
    defaultWidths: {
      view: defaultSharedPaneWidthPx,
      edit: defaultSharedPaneWidthPx,
    },
    minWidths: {
      view: CARD_PANE_EDIT_MIN_WIDTH_PX,
      edit: CARD_PANE_EDIT_MIN_WIDTH_PX,
    },
    measureViewportWidth,
    viewportObserverDeps: [
      embeddedInPager,
      isEditing,
      isMetaOpen,
      normalizedSelectedCardId,
      selectedCardId,
      cardLayoutMode,
    ],
    allowStoredWidthBeyondViewport: true,
    previewBehavior: "both",
    persistBehavior: "both",
    onPersist: (mode, widthPx) => {
      void mode;
      if (!cardSetId) return;
      setCardSetWidthPreference(cardSetId, "view", widthPx);
      setCardSetWidthPreference(cardSetId, "edit", widthPx);
    },
  });

  const showWidthControl = !embeddedInPager;

  const hasForcedPaneWidth =
    typeof forcedPaneWidthPx === "number" && Number.isFinite(forcedPaneWidthPx);

  const shouldUseEdgeToEdgePaneWidth = isMetaOpen && !embeddedInPager;

  const resolvedPaneWidthPx = hasForcedPaneWidth
    ? clampPaneWidthPx(forcedPaneWidthPx, activePaneMinWidthPx)
    : shouldUseEdgeToEdgePaneWidth
      ? activePaneMaxWidthPx
      : activePaneWidthPx;

  const shouldReserveWidthControlSpace =
    showWidthControl && dockToolbarsToTop && !usesExternalToolbarMount;

  const hideCardShellHeader = embeddedInPager && dockToolbarsToTop;

  const shouldDockToolbarToCardTop =
    dockToolbarsToTop && !hideBlockToolbars && !usesExternalToolbarMount;

  const shouldShowInlineToolbarMount =
    !dockToolbarsToTop && !hideBlockToolbars && !usesExternalToolbarMount;

  const shouldApplyPaneWidth =
    (showWidthControl && contentViewportWidth > 0) || (forcedPaneWidthPx !== null && forcedPaneWidthPx !== undefined);

  const availablePaneWidthPx =
    contentViewportWidth > 0 ? contentViewportWidth : resolvedPaneWidthPx;

  const effectivePaneWidthPx = hasForcedPaneWidth
    ? resolvedPaneWidthPx
    : shouldApplyPaneWidth
      ? Math.max(1, Math.min(resolvedPaneWidthPx, availablePaneWidthPx))
      : Math.max(1, availablePaneWidthPx || activePaneMinWidthPx);

  const useTwoColumnEditorLayout =
    cardLayoutMode === "split" &&
    effectivePaneWidthPx >= CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX;

  const editorCardFitScale = resolveEditorCardFitScale({
    availablePaneWidthPx: effectivePaneWidthPx,
    canonicalCardWidth,
    cardLayoutMode,
    splitGapPx: CARD_EDITOR_PAIR_GAP_PX,
  });

  const activePaneWidthStyle = shouldApplyPaneWidth
    ? {
      width: `${resolvedPaneWidthPx}px`,
      maxWidth: "100%",
    }
    : undefined;

  return {
    contentViewportRef,
    showWidthControl,
    activePaneMode,
    activePaneMinWidthPx,
    activePaneMaxWidthPx,
    activePaneWidthPx,
    activePaneDisplayedDefaultWidthPx,
    shouldReserveWidthControlSpace,
    hideCardShellHeader,
    shouldDockToolbarToCardTop,
    shouldShowInlineToolbarMount,
    useTwoColumnEditorLayout,
    editorCardFitScale,
    activePaneWidthStyle,
    persistPaneWidth,
    previewPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  };
};



export { CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX, useCardEditorPaneWidth };
