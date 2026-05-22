import { cn } from "@/lib/utils";

export const pdfOverlayToolbarShellClassName = cn(
  "translate-y-[8px] rounded-[28px] border border-white/70",
  "bg-[rgba(248,250,252,0.72)] text-[#1D1D1F] backdrop-blur-[24px] backdrop-saturate-[180%]",
  "shadow-[0_18px_42px_rgba(15,23,42,0.14),0_2px_8px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.88),inset_0_-1px_0_rgba(255,255,255,0.35)]",
);

export const pdfOverlayToolbarButtonClassName = cn(
  "h-8 w-8 rounded-full border border-white/65",
  "bg-white/55 text-[#1D1D1F] backdrop-blur-[18px]",
  "shadow-[0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.86)]",
  "transition-[transform,background-color,border-color,box-shadow,color] duration-150",
  "hover:bg-white/75 hover:text-[#111827] active:scale-95 active:bg-white/85",
  "disabled:border-white/35 disabled:bg-white/28 disabled:text-[#8E8E93]/45 disabled:shadow-none disabled:opacity-100",
  "disabled:hover:bg-white/28 disabled:hover:text-[#8E8E93]/45 disabled:active:scale-100",
);

export const pdfOverlayToolbarButtonActiveClassName = cn(
  "border-[#007AFF]/25 bg-[#007AFF]/12 text-[#007AFF]",
  "shadow-[inset_0_0_0_1px_rgba(0,122,255,0.06),0_1px_2px_rgba(0,122,255,0.12)]",
);

export const pdfOverlayToolbarDividerClassName =
  "h-5 w-px shrink-0 bg-[#3C3C43]/12";

export const pdfOverlayToolbarNavigatorClassName = "text-[#8E8E93]";

export const pdfOverlayToolbarNavigatorInputClassName = cn(
  "h-8 w-12 rounded-[18px] border border-white/65 bg-white/58 px-2 text-[11px]",
  "text-[#1D1D1F] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]",
  "focus:border-[#007AFF]/35 focus:bg-white/82 focus:ring-2 focus:ring-[#007AFF]/16 sm:w-16",
);

export const pdfOverlayToolbarTotalClassName = "text-[#8E8E93]";

export const pdfOverlayToolbarSliderTrackClassName = cn(
  "h-1.5 bg-[#3C3C43]/18",
  "shadow-[inset_0_1px_1px_rgba(15,23,42,0.08)]",
);

export const pdfOverlayToolbarSliderRangeClassName = "bg-[#007AFF]";

export const pdfOverlayToolbarSliderThumbClassName = cn(
  "[&::-webkit-slider-thumb]:mt-[-7px] [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5",
  "[&::-webkit-slider-thumb]:border-white/80 [&::-webkit-slider-thumb]:bg-white",
  "[&::-webkit-slider-thumb]:shadow-[0_2px_7px_rgba(15,23,42,0.18),0_0_0_0.5px_rgba(60,60,67,0.12)]",
  "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:border-white/80 [&::-moz-range-thumb]:bg-white",
  "[&::-moz-range-thumb]:shadow-[0_2px_7px_rgba(15,23,42,0.18),0_0_0_0.5px_rgba(60,60,67,0.12)]",
);
