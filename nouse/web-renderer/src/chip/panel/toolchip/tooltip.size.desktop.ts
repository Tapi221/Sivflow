const TOOLTIP_RIGHT_CLICK_PANEL_SURFACE_CLASS_NAMES = {
  tooltip: "border border-black/10 bg-white font-normal tracking-normal text-neutral-600 shadow-lg antialiased",
  arrow: "bg-white",
} as const;
const TOOLTIP_SIZE_CLASS_NAMES = {
  default: {
    tooltip: "min-h-7 rounded-full px-3 py-1.5 text-xs leading-none",
    arrow: "h-2.5 w-2.5",
  },
  compact: {
    tooltip: "min-h-6 rounded-full px-2.5 py-1 text-xs leading-none",
    arrow: "h-2 w-2",
  },
  segmented: {
    tooltip: "min-h-7 rounded-full px-3 py-1.5 text-xs leading-none",
    arrow: "h-2.5 w-2.5",
  },
} as const;



type TooltipSize = keyof typeof TOOLTIP_SIZE_CLASS_NAMES;



const TOOLTIP_PRESET_CLASS_NAMES = {
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



type TooltipPreset = keyof typeof TOOLTIP_PRESET_CLASS_NAMES;



export { TOOLTIP_SIZE_CLASS_NAMES, TOOLTIP_PRESET_CLASS_NAMES };


export type { TooltipSize, TooltipPreset };
