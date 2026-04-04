import { useMemo } from "react";

import {
  CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
  CARD_PANE_EDIT_MIN_WIDTH_PX,
  CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
  CARD_PANE_VIEW_MIN_WIDTH_PX,
  clampPaneWidthPx,
} from "@/pages/card-view/constants";
import { useCardPaneWidthState } from "@/components/card/shell/useCardPaneWidthState";
import {
  getCardSetWidthPreference,
  setCardSetWidthPreference,
} from "@/services/cardWidthPreferences";
import type { UserSettings } from "@/types";

interface UseCardViewPaneWidthOptions {
  isGlobalEditing: boolean;
  isDesktop: boolean;
  isMetaOpen: boolean;
  currentIndex: number;
  settings: UserSettings | undefined;
  cardSetId?: string | null;
}

const getReservedScrollbarGutterWidthPx = () => {
  if (typeof document === "undefined") return 0;

  const probe = document.createElement("div");
  probe.style.position = "absolute";
  probe.style.top = "-9999px";
  probe.style.width = "100px";
  probe.style.height = "100px";
  probe.style.overflow = "scroll";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);

  const width = Math.max(0, probe.offsetWidth - probe.clientWidth);
  document.body.removeChild(probe);

  return width;
};

const measureViewportWidth = (element: HTMLDivElement) =>
  Math.max(0, Math.round(element.clientWidth));

export const useCardViewPaneWidth = ({
  isGlobalEditing,
  isDesktop,
  isMetaOpen,
  currentIndex,
  settings,
  cardSetId,
}: UseCardViewPaneWidthOptions) => {
  const reservedScrollbarGutterWidthPx = useMemo(
    () => (isDesktop ? getReservedScrollbarGutterWidthPx() : 0),
    [isDesktop],
  );

  const viewPreferenceKey = `${cardSetId ?? ""}:${settings?.cardViewPaneWidthPx ?? ""}`;
  const editPreferenceKey = `${cardSetId ?? ""}:${settings?.cardEditPaneWidthPx ?? ""}`;

  const preferredViewPaneWidthPx = useMemo(() => {
    const localStored = cardSetId
      ? getCardSetWidthPreference(cardSetId, "view")
      : undefined;

    return clampPaneWidthPx(
      localStored ??
        settings?.cardViewPaneWidthPx ??
        CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
      CARD_PANE_VIEW_MIN_WIDTH_PX,
    );
  }, [cardSetId, settings?.cardViewPaneWidthPx]);

  const preferredEditPaneWidthPx = useMemo(() => {
    const localStored = cardSetId
      ? getCardSetWidthPreference(cardSetId, "edit")
      : undefined;

    return clampPaneWidthPx(
      localStored ??
        settings?.cardEditPaneWidthPx ??
        CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
      CARD_PANE_EDIT_MIN_WIDTH_PX,
    );
  }, [cardSetId, settings?.cardEditPaneWidthPx]);

  const paneWidth = useCardPaneWidthState({
    isEditMode: isGlobalEditing,
    preferredWidths: {
      view: {
        key: viewPreferenceKey,
        width: preferredViewPaneWidthPx,
      },
      edit: {
        key: editPreferenceKey,
        width: preferredEditPaneWidthPx,
      },
    },
    defaultWidths: {
      view: CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
      edit: CARD_PANE_EDIT_DEFAULT_WIDTH_PX,
    },
    minWidths: {
      view: CARD_PANE_VIEW_MIN_WIDTH_PX,
      edit: CARD_PANE_EDIT_MIN_WIDTH_PX,
    },
    measureViewportWidth,
    viewportObserverDeps: [isDesktop, isGlobalEditing, isMetaOpen, currentIndex],
    reservedViewportInsetPx: reservedScrollbarGutterWidthPx,
    allowStoredWidthBeyondViewport: false,
    previewBehavior: "active-only",
    persistBehavior: "active-only",
    onPersist: (mode, widthPx) => {
      if (!cardSetId) return;
      setCardSetWidthPreference(cardSetId, mode, widthPx);
    },
  });

  return {
    ...paneWidth,
  };
};