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
} as const;

export type TooltipSize = keyof typeof TOOLTIP_SIZE_CLASS_NAMES;
