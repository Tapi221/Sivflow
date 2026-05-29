const TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES = {
  tooltip: "border border-[rgba(0,0,0,0.12)] bg-white text-[#4a4a4a] font-normal tracking-normal shadow-[0_6px_20px_rgba(0,0,0,0.14),0_1px_6px_rgba(0,0,0,0.08)] antialiased",
  arrow: "bg-white",
} as const;

export const TOOLTIP_SIZE_CLASS_NAMES = {
  default: {
    tooltip: "min-h-[26px] rounded-[13px] px-3 py-1.5 text-[12px] leading-none",
    arrow: "h-2.5 w-2.5",
  },
  compact: {
    tooltip: "min-h-[22px] rounded-[11px] px-2.5 py-1 text-[11px] leading-none",
    arrow: "h-2 w-2",
  },
  segmented: {
    tooltip: "min-h-[26px] rounded-[13px] px-3 py-1.5 text-[12px] leading-none",
    arrow: "h-2.5 w-2.5",
  },
} as const;

export const TOOLTIP_PRESET_CLASS_NAMES = {
  default: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.default.tooltip} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.default.arrow} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.arrow}`,
  },
  compact: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.compact.tooltip} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.compact.arrow} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.arrow}`,
  },
  segmented: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.tooltip} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.arrow} ${TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES.arrow}`,
  },
} as const;

export type TooltipSize = keyof typeof TOOLTIP_SIZE_CLASS_NAMES;
export type TooltipPreset = keyof typeof TOOLTIP_PRESET_CLASS_NAMES;
