import * as React from "react";
import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";



const surfaceButtonVariants = cva(
  "ds-surface-button inline-flex min-w-0 items-center justify-center overflow-hidden whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
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



interface SurfaceButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof surfaceButtonVariants> {}



const SurfaceButton = React.forwardRef<HTMLButtonElement, SurfaceButtonProps>(({ className, surface, size, type, children, title, ...props }, ref) => {
  const resolvedTitle = typeof title === "string" ? title : typeof children === "string" ? children : undefined;

  return (
    <button
      ref={ref}
      type={
        type ?? "button"}
      title={resolvedTitle}
      className={cn(surfaceButtonVariants({ surface, size }), className)}
      {...props}
    >
      <span className="min-w-0 truncate whitespace-nowrap">{children}</span>
    </button>
  );
});



SurfaceButton.displayName = "SurfaceButton";

export { SurfaceButton };



export type { SurfaceButtonProps };
