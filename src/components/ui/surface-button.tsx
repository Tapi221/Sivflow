import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const surfaceButtonVariants = cva(
  "ds-surface-button inline-flex items-center justify-center disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      surface: {
        convex: "ds-surface-button--convex",
        concave: "ds-surface-button--concave",
        convexActive: "ds-surface-button--convexActive font-medium",
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
