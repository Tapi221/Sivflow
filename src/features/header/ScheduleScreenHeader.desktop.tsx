import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/toggle/Toggle.calendarviewmode";
import { TogglePlanResult, type PlanResultMode } from "@/chip/toggle/Toggle.planresult";
import type { CalendarViewMode, CalendarViewModeSelection } from "@/features/calendar/scheduleScreen.types";

type ScheduleScreenHeaderViewOption = {
  value: CalendarViewMode;
  label: string;
};

type ScheduleScreenHeaderDesktopProps = {
  titleLabel: string;
  selectedViewMode: CalendarViewModeSelection;
  viewOptions: readonly ScheduleScreenHeaderViewOption[];
  planResultModes: readonly PlanResultMode[];
  showPlanResultToggle: boolean;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onChangePlanResultModes: (value: PlanResultMode[]) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  className?: string;
};

const ScheduleScreenHeaderDesktop = ({
  titleLabel,
  selectedViewMode,
  viewOptions,
  planResultModes,
  showPlanResultToggle,
  onSelectViewMode,
  onChangePlanResultModes,
  onPrevious,
  onNext,
  onToday,
  className,
}: ScheduleScreenHeaderDesktopProps) => {
  return (
    <div className={className}>
      <h1 className="w-32 shrink-0 truncate text-[17px] font-semibold tracking-[-0.01em] text-[#1c1c1e]">
        {titleLabel}
      </h1>

      <div className="ml-auto flex shrink-0 items-center gap-2">
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

        {showPlanResultToggle && (
          <TogglePlanResult
            value={planResultModes}
            onChange={onChangePlanResultModes}
          />
        )}
      </div>
    </div>
  );
};

export { ScheduleScreenHeaderDesktop };
