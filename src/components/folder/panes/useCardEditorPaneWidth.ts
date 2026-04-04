import { useMemo } from "react";

import {
  CARD_PANE_AUTO_MAX_SCALE,
  CARD_PANE_EDIT_MIN_WIDTH_PX,
  CARD_PANE_EDITOR_DEFAULT_WIDTH_PX,
  CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX,
  CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX,
  CARD_PANE_WIDTH_STEP_PX,
  clampPaneWidthPx,
} from "@/components/card/shell/cardPaneWidthConstants";
import { useCardPaneWidthState } from "@/components/card/shell/useCardPaneWidthState";
import {
  getCardSetWidthPreference,
  setCardSetWidthPreference,
} from "@/services/cardWidthPreferences";
import type { UserSettings } from "@/types";

const CARD_EDITOR_PAIR_GAP_PX = 16;
const CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX = CARD_PANE_EDIT_MIN_WIDTH_PX;

interface UseCardEditorPaneWidthParams {
  settings?: Partial<UserSettings> | null;
  dockToolbarsToTop: boolean;
  embeddedInPager: boolean;
  hideBlockToolbars: boolean;
  forcedPaneWidthPx: number | null;
  usesExternalToolbarMount: boolean;
  isPagerActiveCard: boolean;
  isEditing: boolean;
  isMetaOpen: boolean;
  normalizedSelectedCardId: string | null;
  selectedCardId?: string;
  canonicalCardWidth: number;
  cardSetId?: string | null;
}

const measureViewportWidth = (element: HTMLDivElement) =>
  Math.max(
    0,
    Math.round(
      Math.max(element.clientWidth, element.parentElement?.clientWidth ?? 0),
    ),
  );

export const useCardEditorPaneWidth = ({
  settings,
  dockToolbarsToTop,
  embeddedInPager,
  hideBlockToolbars,
  forcedPaneWidthPx,
  usesExternalToolbarMount,
  isPagerActiveCard,
  isEditing,
  isMetaOpen,
  normalizedSelectedCardId,
  selectedCardId,
  canonicalCardWidth,
  cardSetId,
}: UseCardEditorPaneWidthParams) => {
  const defaultSharedPaneWidthPx = dockToolbarsToTop
    ? CARD_PANE_EDITOR_DOCKED_DEFAULT_WIDTH_PX
    : CARD_PANE_EDITOR_DEFAULT_WIDTH_PX;

  const preferenceScopeKey = `${cardSetId ?? ""}:${defaultSharedPaneWidthPx}:${settings?.cardEditPaneWidthPx ?? ""}:${settings?.cardViewPaneWidthPx ?? ""}`;

  const preferredViewPaneWidthPx = useMemo(() => {
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

  const preferredEditPaneWidthPx = useMemo(() => {
    const localStoredEdit = cardSetId
      ? getCardSetWidthPreference(cardSetId, "edit")
      : undefined;
    const localStoredView = cardSetId
      ? getCardSetWidthPreference(cardSetId, "view")
      : undefined;

    return clampPaneWidthPx(
      localStoredEdit ??
        localStoredView ??
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
        key: `${preferenceScopeKey}:view`,
        width: preferredViewPaneWidthPx,
      },
      edit: {
        key: `${preferenceScopeKey}:edit`,
        width: preferredEditPaneWidthPx,
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
    ],
    allowStoredWidthBeyondViewport: true,
    previewBehavior: "both",
    persistBehavior: "both",
    onPersist: (mode, widthPx) => {
      if (!cardSetId) return;
      setCardSetWidthPreference(cardSetId, mode, widthPx);
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

  const shouldShowEditingBadge = !embeddedInPager || isPagerActiveCard;

  const shouldApplyPaneWidth =
    (showWidthControl && contentViewportWidth > 0) || forcedPaneWidthPx != null;

  const availablePaneWidthPx =
    contentViewportWidth > 0 ? contentViewportWidth : resolvedPaneWidthPx;

  const effectivePaneWidthPx = hasForcedPaneWidth
    ? resolvedPaneWidthPx
    : shouldApplyPaneWidth
      ? Math.max(1, Math.min(resolvedPaneWidthPx, availablePaneWidthPx))
      : Math.max(1, availablePaneWidthPx || activePaneMinWidthPx);

  const useTwoColumnEditorLayout =
    (embeddedInPager && isEditing) ||
    effectivePaneWidthPx >= CARD_EDITOR_TWO_COLUMN_MIN_WIDTH_PX;

  const editorCardTargetWidthPx = useTwoColumnEditorLayout
    ? Math.max(1, (effectivePaneWidthPx - CARD_EDITOR_PAIR_GAP_PX) / 2)
    : Math.max(1, effectivePaneWidthPx);

  const editorCardFixedScale = Math.max(
    0.1,
    Math.min(
      CARD_PANE_AUTO_MAX_SCALE,
      editorCardTargetWidthPx / Math.max(1, canonicalCardWidth),
    ),
  );

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
    shouldShowEditingBadge,
    useTwoColumnEditorLayout,
    editorCardFixedScale,
    activePaneWidthStyle,
    persistPaneWidth,
    previewPaneWidth,
    stepPaneWidth,
    resetActivePaneWidth,
  };
};

export { CARD_PANE_WIDTH_CONTROL_CLEARANCE_PX, CARD_PANE_WIDTH_STEP_PX };
