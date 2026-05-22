import type { ChangeEvent } from "react";

import type { CalendarViewMode } from "@/features/calendar/calendar.types";
import { ChevronDown } from "@/ui/icons";
import { cn } from "@/lib/utils";

type ViewModeDropdownOption = {
  value: CalendarViewMode;
  label: string;
};

type ViewModeDropdownProps = {
  value: CalendarViewMode;
  onChange: (value: CalendarViewMode) => void;
  options: readonly ViewModeDropdownOption[];
  className?: string;
};

export const ViewModeDropdown = ({
  value,
  onChange,
  options,
  className,
}: ViewModeDropdownProps) => {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.currentTarget.value as CalendarViewMode);
  };

  return (
    <label
      className={cn(
        "relative inline-flex h-8 min-w-[92px] items-center rounded-full border border-[#d1d1d6]/70 bg-white/90 text-[12px] font-semibold leading-none tracking-[-0.01em] text-[#1c1c1e] shadow-[0_1px_2px_rgba(0,0,0,0.05)] backdrop-blur-xl",
        "transition-[border-color,box-shadow,background-color] duration-150 ease-out focus-within:border-[#007aff]/45 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(0,122,255,0.14)]",
        className,
      )}
    >
      <span className="sr-only">表示形式</span>
      <select
        value={value}
        onChange={handleChange}
        className="h-full w-full cursor-pointer appearance-none rounded-full bg-transparent py-0 pl-3 pr-8 text-inherit outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[#8f96a3]"
      />
    </label>
  );
};
