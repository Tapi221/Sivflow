import { cn } from "@/lib/utils";

export const pdfOverlayToolbarShellClassName = cn(
  "translate-y-[8px] rounded-[999px] border border-[#E2E4E9]",
  "bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FA_100%)]",
  "shadow-[0_8px_24px_rgba(37,39,45,0.08),inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(226,228,233,0.9)]",
);

export const pdfOverlayToolbarButtonClassName = cn(
  "h-7 w-7 rounded-full border border-[#DDE1E7]",
  "bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F7F9_100%)] text-[#74798B]",
  "shadow-[0_2px_6px_rgba(37,39,45,0.08),inset_0_1px_0_rgba(255,255,255,0.96)]",
  "hover:bg-[linear-gradient(180deg,#FFFFFF_0%,#F4F6F8_100%)] hover:text-[#25272D]",
  "disabled:border-[#E2E4E9] disabled:bg-[#FBFBFC] disabled:text-[#C6CBD4] disabled:shadow-none",
  "disabled:hover:bg-[#FBFBFC] disabled:hover:text-[#C6CBD4]",
);

export const pdfOverlayToolbarButtonActiveClassName = cn(
  "border-[#D8DDE5] bg-[linear-gradient(180deg,#FDFDFE_0%,#F2F4F7_100%)] text-[#25272D]",
  "shadow-[inset_0_1px_2px_rgba(37,39,45,0.08),inset_0_1px_0_rgba(255,255,255,0.75)]",
);

export const pdfOverlayToolbarDividerClassName =
  "h-4 w-px shrink-0 bg-[#E2E4E9]";

export const pdfOverlayToolbarNavigatorClassName =
  "text-[#74798B]";

export const pdfOverlayToolbarNavigatorInputClassName = cn(
  "h-7 rounded-full border border-[#DDE1E7] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F8FA_100%)]",
  "text-[#25272D] shadow-[0_1px_4px_rgba(37,39,45,0.06),inset_0_1px_0_rgba(255,255,255,0.94)]",
  "focus:border-[#C9CED8] focus:bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F9FB_100%)]",
);

export const pdfOverlayToolbarTotalClassName =
  "text-[#74798B]";

export const pdfOverlayToolbarSliderTrackClassName = cn(
  "bg-[#D9DDE4]",
  "shadow-[inset_0_1px_2px_rgba(37,39,45,0.10)]",
);

export const pdfOverlayToolbarSliderRangeClassName =
  "bg-[#6F7F9E]";

export const pdfOverlayToolbarSliderThumbClassName = cn(
  "[&::-webkit-slider-thumb]:border-[#DDE1E7] [&::-webkit-slider-thumb]:bg-[linear-gradient(180deg,#FFFFFF_0%,#F5F6F8_100%)]",
  "[&::-webkit-slider-thumb]:shadow-[0_3px_8px_rgba(37,39,45,0.16),inset_0_1px_0_rgba(255,255,255,0.96)]",
  "[&::-moz-range-thumb]:border-[#DDE1E7] [&::-moz-range-thumb]:bg-[linear-gradient(180deg,#FFFFFF_0%,#F5F6F8_100%)]",
  "[&::-moz-range-thumb]:shadow-[0_3px_8px_rgba(37,39,45,0.16),inset_0_1px_0_rgba(255,255,255,0.96)]",
);
