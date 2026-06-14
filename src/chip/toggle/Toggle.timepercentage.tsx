import { memo } from "react";
import { cn } from "@/lib/utils";

type TimePercentageToggleValue = "time" | "percentage";
type TimePercentageToggleOption = {
  value: TimePercentageToggleValue;
  label: string;
};
type ToggleTimePercentageProps = {
  value: TimePercentageToggleValue;
  className?: string;
};

const TIME_PERCENTAGE_TOGGLE_OPTIONS: readonly TimePercentageToggleOption[] = [
  {
    value: "time",
    label: "時間",
  },
  {
    value: "percentage",
    label: "割合",
  },
];

const ToggleTimePercentageComponent = ({ value, className }: ToggleTimePercentageProps) => {
  return (
    <div
      role="group"
      aria-label="時間・割合"
      className={cn(
        "grid grid-cols-2 rounded-xl bg-zinc-100 p-0.5 text-center text-xs font-semibold text-zinc-500",
        className,
      )}
    >
      {TIME_PERCENTAGE_TOGGLE_OPTIONS.map((option) => {
        const isActive = value === option.value;
        return (
          <span
            key={option.value}
            data-active={isActive}
            className={cn(
              "py-1",
              isActive && "rounded-lg bg-white shadow-sm",
            )}
          >
            {option.label}
          </span>
        );
      })}
    </div>
  );
};

const ToggleTimePercentage = memo(ToggleTimePercentageComponent);
ToggleTimePercentage.displayName = "ToggleTimePercentage";
export { ToggleTimePercentage };
export type { TimePercentageToggleValue };
