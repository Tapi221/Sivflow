import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const surfaceButtonVariants = cva(
  "inline-flex items-center justify-center rounded border transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      surface: {
        convex:
          "border-[var(--surface-border)] bg-white text-[#6e6466] surface-convex hover:bg-white",
        concave:
          "border-[var(--surface-border)] bg-white text-slate-600 surface-concave hover:text-slate-800",
        convexActive:
          "border-[#cfd9e8] bg-[#dfe7f3] text-[#2f5ea8] font-medium shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_-1px_0_rgba(86,72,74,0.10)_inset,0_1px_2px_rgba(86,72,74,0.12)]",
      },
      size: {
        xs: "px-2 py-0.5 text-[11px]",
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      surface: "convex",
      size: "sm",
    },
  },
);

export interface SurfaceButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof surfaceButtonVariants> {}

export const SurfaceButton = React.forwardRef<
  HTMLButtonElement,
  SurfaceButtonProps
>(({ className, surface, size, type, ...props }, ref) => (
  <button
    ref={ref}
    type={type ?? "button"}
    className={cn(surfaceButtonVariants({ surface, size }), className)}
    {...props}
  />
));

SurfaceButton.displayName = "SurfaceButton";




