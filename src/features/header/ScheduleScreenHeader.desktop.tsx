import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/dropdownchip/ViewModeDropdownChip";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

type ScheduleScreenHeaderViewOption = {
  value: CalendarViewMode;
  label: string;
};

type ScheduleScreenHeaderDesktopProps = {
  titleLabel: string;
  selectedViewMode: CalendarViewMode;
  viewOptions: readonly ScheduleScreenHeaderViewOption[];
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

export const ScheduleScreenHeaderDesktop = ({
  titleLabel,
  selectedViewMode,
  viewOptions,
  onSelectViewMode,
  onPrevious,
  onNext,
  onToday,
  className,
}: ScheduleScreenHeaderDesktopProps) => {
  return (
    <div className={className}>
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
          {titleLabel}
        </h1>

        <div className="flex shrink-0 items-center gap-2">
          <ViewModeDropdown
            value={selectedViewMode}
            onChange={onSelectViewMode}
            options={viewOptions}
          />

          <TodayBar
            onPrevious={onPrevious}
            onNext={onNext}
            onToday={onToday}
          />
        </div>
      </div>
    </div>
  );
};
