import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type AnimatedCheckboxShape = "circle" | "square";
export type AnimatedCheckboxVariant = "filled" | "soft" | "outline" | "radio";

export type AnimatedCheckboxBaseProps = {
  checked: boolean;
  color: string;
  className?: string;
  shape?: AnimatedCheckboxShape;
  variant?: AnimatedCheckboxVariant;
  indeterminate?: boolean;
};

export const AnimatedCheckboxBase = ({
  checked,
  color,
  className,
  shape = "circle",
  variant = "filled",
  indeterminate = false,
}: AnimatedCheckboxBaseProps) => {
  const active = checked || indeterminate;

  let radiusClass = "rounded-full";
  if (shape === "square") radiusClass = "rounded-[4px]";

  let strokeColor = color;
  if (variant === "filled") strokeColor = "white";

  let strokeDashoffset = 16;
  if (checked) strokeDashoffset = 0;

  let showFill = active && variant === "filled";
  if (variant === "soft" && active) showFill = true;

  let fillColor = color;
  if (variant === "soft") fillColor = "color-mix(in srgb, var(--checkbox-color) 16%, transparent)";

  const rootStyle = { "--checkbox-color": color } as CSSProperties;

  return (
    <span className={cn("relative h-3.5 w-3.5 shrink-0", className)} style={rootStyle}>
      <span
        className={cn(
          "absolute inset-0 border-[1.5px] transition-all duration-200 ease-out",
          radiusClass,
          active && variant === "filled" && "scale-75 opacity-0",
          (!active || variant !== "filled") && "scale-100 opacity-100",
        )}
        style={{ borderColor: color }}
      />

      <span
        className={cn(
          "absolute inset-0 transition-all duration-200",
          radiusClass,
          showFill && "scale-100 opacity-100",
          !showFill && "scale-0 opacity-0",
        )}
        style={{
          backgroundColor: fillColor,
          transitionTimingFunction: "cubic-bezier(.2,.9,.3,1.25)",
        }}
      />

      {variant === "radio" && (
        <span
          className={cn(
            "absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200",
            checked && "scale-100 opacity-100",
            !checked && "scale-0 opacity-0",
          )}
          style={{ backgroundColor: color }}
        />
      )}

      {variant !== "radio" && (
        <svg
          viewBox="0 0 20 20"
          className={cn(
            "absolute inset-0 h-full w-full transition-all duration-200 ease-out",
            active && "scale-100 opacity-100",
            !active && "scale-50 opacity-0",
          )}
          aria-hidden="true"
        >
          {indeterminate ? (
            <path
              d="M5.5 10H14.5"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{
                strokeDasharray: 10,
                strokeDashoffset: active ? 0 : 10,
                transition: "stroke-dashoffset 160ms ease-out 80ms",
              }}
            />
          ) : (
            <path
              d="M5.25 10.4L8.4 13.55L14.75 7.2"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: 16,
                strokeDashoffset,
                transition: "stroke-dashoffset 180ms ease-out 90ms",
              }}
            />
          )}
        </svg>
      )}
    </span>
  );
};