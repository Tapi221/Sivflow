type HoverTooltipOpenListener = (tooltipId: symbol) => void;

type HoverTooltipOpenEventDetail = {
  tooltipId: symbol;
};

const HOVER_TOOLTIP_OPEN_EVENT = "manifolia:hover-tooltip-open";

const isHoverTooltipOpenEvent = (event: Event): event is CustomEvent<HoverTooltipOpenEventDetail> => {
  const detail = "detail" in event ? (event as CustomEvent<Partial<HoverTooltipOpenEventDetail>>).detail : null;

  return Boolean(detail && typeof detail.tooltipId === "symbol");
};

const emitHoverTooltipOpen = (tooltipId: symbol) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new CustomEvent<HoverTooltipOpenEventDetail>(HOVER_TOOLTIP_OPEN_EVENT, { detail: { tooltipId } }));
};

const subscribeHoverTooltipOpen = (listener: HoverTooltipOpenListener) => {
  if (typeof window === "undefined") return () => undefined;

  const handleTooltipOpen = (event: Event) => {
    if (!isHoverTooltipOpenEvent(event)) return;

    listener(event.detail.tooltipId);
  };

  window.addEventListener(HOVER_TOOLTIP_OPEN_EVENT, handleTooltipOpen);

  return () => {
    window.removeEventListener(HOVER_TOOLTIP_OPEN_EVENT, handleTooltipOpen);
  };
};

export { emitHoverTooltipOpen, subscribeHoverTooltipOpen };
