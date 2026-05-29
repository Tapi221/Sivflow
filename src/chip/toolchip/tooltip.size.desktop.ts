const TOOLTIP_SURFACE_CLASS_NAMES = {
  tooltip: "border border-[#d9d9df] bg-[#f5f5f7] text-[#5a5a63] shadow-[0_8px_22px_rgba(24,24,27,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]",
  arrow: "border border-[#d9d9df] bg-[#f5f5f7]",
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
