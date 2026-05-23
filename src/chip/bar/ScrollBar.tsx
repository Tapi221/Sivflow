import React from "react";

import { Slider } from "@/components/ui/slider";

import { cn } from "@/lib/utils";

export type ScrollBarProps = {
  value: readonly number[];
  min: number;
  max: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
};

export const ScrollBar = React.forwardRef<HTMLInputElement, ScrollBarProps>(
  (
    {
      value,
      min,
      max,
      step,
      onValueChange,
      onValueCommit,
      ariaLabel,
      disabled = false,
      className,
      trackClassName,
      rangeClassName,
      thumbClassName,
    },
    ref,
  ) => {
    return (
      <div className={cn("w-14 px-0.5 sm:w-16", className)}>
        <Slider
          ref={ref}
          min={min}
          max={max}
          step={step}
          value={value}
          onValueChange={onValueChange}
          onValueCommit={onValueCommit}
          aria-label={ariaLabel}
          disabled={disabled}
          trackClassName={trackClassName}
          rangeClassName={rangeClassName}
          thumbClassName={thumbClassName}
        />
      </div>
    );
  },
);

ScrollBar.displayName = "ScrollBar";
