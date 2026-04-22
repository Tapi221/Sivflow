import type { ReactNode } from "react";
import { SurfaceButton } from "@/components/ui/surface-button";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  label: ReactNode;
  value: T;
  ariaLabel?: string;
  disabled?: boolean;
};

interface SegmentedControlGroupProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: "xs" | "sm" | "md";
  className?: string;
  buttonClassName?: string;
}

export const SegmentedControlGroup = <T extends string,>({
  value,
  options,
  onChange,
  size = "xs",
  className,
  buttonClassName,
}: SegmentedControlGroupProps<T>) => {
  return (
    <div className={cn("ds-segmented-control", className)}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <SurfaceButton
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            aria-label={option.ariaLabel}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
            surface={isSelected ? "convexActive" : "concave"}
            size={size}
            className={buttonClassName}
          >
            {option.label}
          </SurfaceButton>
        );
      })}
    </div>
  );
};
