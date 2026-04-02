export const FROSTED_POPOVER_CLASS = "border-slate-200/80 text-slate-800";

export const FROSTED_POPOVER_STYLE = {
  background: "rgba(255, 255, 255, 0.82)",
  color: "rgb(30, 41, 59)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
} as const;

export const VIEW_WIDTH_FROSTED_POPOVER_STYLE = {
  ...FROSTED_POPOVER_STYLE,
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
} as const;
