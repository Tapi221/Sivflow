const TOOLTIP_DARK_SURFACE_CLASS_NAME = "bg-[#1c1c1e]/95 backdrop-blur-md";

const TOOLTIP_LIGHT_SURFACE_CLASS_NAMES = {
  tooltip: "border border-[#eeeeee] bg-white text-[#8c8c8c]",
  arrow: "border-b border-r border-[#eeeeee] bg-white",
} as const;

export const TOOLTIP_SIZE_CLASS_NAMES = {
  default: {
    tooltip:
      "min-h-[26px] rounded-[9px] px-2.5 py-1 text-[12px] leading-[1.2] shadow-[0_8px_20px_rgba(0,0,0,0.2)]",
    arrow: "h-2 w-2",
  },
  compact: {
    tooltip:
      "min-h-[20px] rounded-[7px] px-2 py-0.5 text-[10px] leading-[1.15] shadow-[0_4px_12px_rgba(0,0,0,0.16)]",
    arrow: "h-1.5 w-1.5",
  },
  segmented: {
    tooltip:
      "min-h-[26px] rounded-lg px-2.5 py-[5px] text-[12px] leading-[1.2] shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
    arrow: "h-2 w-2",
  },
} as const;

export const TOOLTIP_PRESET_CLASS_NAMES = {
  default: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.default.tooltip} ${TOOLTIP_DARK_SURFACE_CLASS_NAME} text-white`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.default.arrow} ${TOOLTIP_DARK_SURFACE_CLASS_NAME}`,
  },
  compact: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.compact.tooltip} ${TOOLTIP_DARK_SURFACE_CLASS_NAME} text-white`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.compact.arrow} ${TOOLTIP_DARK_SURFACE_CLASS_NAME}`,
  },
  segmented: {
    tooltip: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.tooltip} ${TOOLTIP_LIGHT_SURFACE_CLASS_NAMES.tooltip}`,
    arrow: `${TOOLTIP_SIZE_CLASS_NAMES.segmented.arrow} ${TOOLTIP_LIGHT_SURFACE_CLASS_NAMES.arrow}`,
  },
} as const;

export type TooltipSize = keyof typeof TOOLTIP_SIZE_CLASS_NAMES;
export type TooltipPreset = keyof typeof TOOLTIP_PRESET_CLASS_NAMES;
