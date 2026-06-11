import { useMemo } from "react";
import { CARD_PANE_VIEW_DEFAULT_WIDTH_PX, CARD_PANE_VIEW_MIN_WIDTH_PX, clampPaneWidthPx } from "@/components/card/frame/cardPane.constants";
import { useCardPaneWidthState } from "@/components/card/shell/useCardPanewidthState";
import { getCardSetWidthPreference, setCardSetWidthPreference } from "@/services/cardWidthPreferences";
import type { UserSettings } from "@/types";



interface UseCardSetViewPaneWidthOptions {
  isGlobalEditing: boolean;
  isDesktop: boolean;
  settings: Partial<UserSettings> | null | undefined;
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
const useCardSetViewPaneWidth = ({ isGlobalEditing, isDesktop, settings, cardSetId }: UseCardSetViewPaneWidthOptions) => {
  const reservedScrollbarGutterWidthPx = useMemo(() => (isDesktop ? getReservedScrollbarGutterWidthPx() : 0), [isDesktop]);

  const sharedPreferenceKey = `${cardSetId ?? ""}:${settings?.cardViewPaneWidthPx ?? ""}:${settings?.cardEditPaneWidthPx ?? ""}`;

  const preferredSharedPaneWidthPx = useMemo(() => {
    const storedViewWidth = cardSetId
      ? getCardSetWidthPreference(cardSetId, "view")
      : undefined;
    const storedEditWidth = cardSetId
      ? getCardSetWidthPreference(cardSetId, "edit")
      : undefined;

    return clampPaneWidthPx(
      storedViewWidth ??
      storedEditWidth ??
      settings?.cardViewPaneWidthPx ??
      settings?.cardEditPaneWidthPx ??
      CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
      CARD_PANE_VIEW_MIN_WIDTH_PX,
    );
  }, [cardSetId, settings?.cardEditPaneWidthPx, settings?.cardViewPaneWidthPx]);

  return useCardPaneWidthState({
    isEditMode: isGlobalEditing,
    preferredWidths: {
      view: {
        key: `${sharedPreferenceKey}:shared`,
        width: preferredSharedPaneWidthPx,
      },
      edit: {
        key: `${sharedPreferenceKey}:shared`,
        width: preferredSharedPaneWidthPx,
      },
    },
    defaultWidths: {
      view: CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
      edit: CARD_PANE_VIEW_DEFAULT_WIDTH_PX,
    },
    minWidths: {
      view: CARD_PANE_VIEW_MIN_WIDTH_PX,
      edit: CARD_PANE_VIEW_MIN_WIDTH_PX,
    },
    measureViewportWidth,
    viewportObserverDeps: [isDesktop, isGlobalEditing],
    reservedViewportInsetPx: reservedScrollbarGutterWidthPx,
    allowStoredWidthBeyondViewport: false,
    previewBehavior: "both",
    persistBehavior: "both",
    onPersist: (_mode, widthPx) => {
      if (!cardSetId) return;
      setCardSetWidthPreference(cardSetId, "view", widthPx);
      setCardSetWidthPreference(cardSetId, "edit", widthPx);
    },
  });
};



export { useCardSetViewPaneWidth };
