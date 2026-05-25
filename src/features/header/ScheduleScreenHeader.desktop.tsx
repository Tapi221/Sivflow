import { TodayBar } from "@/chip/bar/TodayBar";
import { ViewModeDropdown } from "@/chip/dropdownchip/ViewModeDropdownChip";
import { SidebarPanelIcon } from "@/components/icons/icons.schedule";
import type { CalendarViewMode } from "@/features/calendar/scheduleScreen.types";

type ScheduleScreenHeaderViewOption = {
  value: CalendarViewMode;
  label: string;
};

type ScheduleScreenHeaderDesktopProps = {
  titleLabel: string;
  selectedViewMode: CalendarViewMode;
  viewOptions: readonly ScheduleScreenHeaderViewOption[];
  canShowDayDetailPanel: boolean;
  showDayDetailPanel: boolean;
  dayDetailToggleLabel: string;
  onSelectViewMode: (viewMode: CalendarViewMode) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleDayDetailPanel: () => void;
  className?: string;
};

const DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS =
  "flex h-7 w-8 min-w-0 shrink-0 items-center justify-center rounded-lg border border-transparent bg-transparent p-0 text-[#8c8c8c] shadow-none appearance-none select-none outline-none ring-0 transition-colors duration-300 ease-[cubic-bezier(.22,1,.36,1)] hover:bg-[#f7f7f7] hover:text-[#6e6e73] focus:outline-none focus:ring-0 focus-visible:outline-none motion-reduce:transition-none";

export const ScheduleScreenHeaderDesktop = ({
  titleLabel,
  selectedViewMode,
  viewOptions,
  canShowDayDetailPanel,
  showDayDetailPanel,
  dayDetailToggleLabel,
  onSelectViewMode,
  onPrevious,
  onNext,
  onToday,
  onToggleDayDetailPanel,
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

      {canShowDayDetailPanel ? (
        <div className="flex flex-1 justify-end pr-20">
          <button
            type="button"
            className={DAY_DETAIL_PANEL_TOGGLE_BUTTON_CLASS}
            onClick={onToggleDayDetailPanel}
            aria-label={dayDetailToggleLabel}
            aria-pressed={showDayDetailPanel}
            aria-expanded={showDayDetailPanel}
          >
            <SidebarPanelIcon className="h-4 w-4 -scale-x-100" />
          </button>
        </div>
      ) : null}
    </div>
  );
};
