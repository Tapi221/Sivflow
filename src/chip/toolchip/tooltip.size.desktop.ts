const TOOLTIP_SURFACE_CLASS_NAMES = {
  tooltip: "border border-[#ececf0] bg-white text-[#60636b] shadow-[0_6px_16px_rgba(35,36,40,0.12)]",
  arrow: "hidden",
} as const;

export const TOOLTIP_SIZE_CLASS_NAMES = {
  default: {
    tooltip: "min-h-[22px] rounded-[8px] px-2.5 py-1 text-[12px] leading-none",
    arrow: "h-0 w-0",
  },
  compact: {
    tooltip: "min-h-[20px] rounded-[7px] px-2 py-0.5 text-[10px] leading-none",
    arrow: "h-0 w-0",
  },
  segmented: {
    tooltip: "min-h-[22px] rounded-[8px] px-2.5 py-1 text-[12px] leading-none",
    arrow: "h-0 w-0",
  },
} as const;

export const TOOLTIP_PRESET_CLASS_NAMES = {
  default: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.default.tooltip} ${TOOLTIP_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.default.arrow} ${TOOLTIP_SURFACE_CLASS_NAMES.arrow}`,
  },
  compact: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.compact.tooltip} ${TOOLTIP_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.compact.arrow} ${TOOLTIP_SURFACE_CLASS_NAMES.arrow}`,
  },
  segmented: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.tooltip} ${TOOLTIP_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.arrow} ${TOOLTIP_SURFACE_CLASS_NAMES.arrow}`,
  },
} as const;

export type TooltipSize = keyof typeof TOOLTIP_SIZE_CLASS_NAMES;
export type TooltipPreset = keyof typeof TOOLTIP_PRESET_CLASS_NAMES;
