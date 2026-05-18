import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Filter, Search } from "@/ui/icons";
import type { IconProps } from "@/ui/icons";
import {
  FieldsToolbarIcon,
  SortToolbarIcon,
  TimelineToolbarIcon,
  DayViewToolbarIcon,
  MonthViewToolbarIcon,
  WeekViewToolbarIcon,
  TaskToolbarIcon,  
} from "./calendar.icons";
import type {
  CalendarToolbarMode,
  CalendarViewMode,
  CalendarWorkspaceToolbarProps,
} from "./calendarPane.types";

export type { CalendarWorkspaceToolbarProps };

const CALENDAR_TOOLBAR_ACTIONS = [
  { label: "Search", icon: Search },
  { label: "Filter", icon: Filter },
  { label: "Sort", icon: SortToolbarIcon },
  { label: "Fields", icon: FieldsToolbarIcon },
] as const;

const CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS = [
  { value: "month", label: "Month", icon: MonthViewToolbarIcon },
  { value: "week", label: "Week", icon: WeekViewToolbarIcon },
  { value: "days", label: "Day", icon: DayViewToolbarIcon },
] as const satisfies Array<{
  value: CalendarViewMode;
  label: string;
  icon: React.ComponentType<IconProps>;
}>;

export const CalendarWorkspaceToolbar = ({
  activeMode,
  viewMode,
  onSelectCalendar,
  onSelectTimeline,
  onSelectTask,
  onSelectViewMode,
}: CalendarWorkspaceToolbarProps) => {
  const tabs = [
    {
      value: "calendar" as CalendarToolbarMode,
      label: "Calendar",
      icon: CalendarIcon,
      onClick: onSelectCalendar,
    },
    {
      value: "timeline" as CalendarToolbarMode,
      label: "Timeline",
      icon: TimelineToolbarIcon,
      onClick: onSelectTimeline,
    },
    {
    value: "task" as CalendarToolbarMode,   
    label: "Task",
    icon: TaskToolbarIcon,
    onClick: onSelectTask,
  },

  ];

  return (
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 flex-wrap items-center justify-between overflow-hidden bg-white after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">
      <div className="flex h-7 shrink-0 items-start gap-[6px]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMode === tab.value;
          return (
            <div key={tab.value} className="flex flex-col items-start pb-2">
              <button
                type="button"
                className={cn(
                  "flex h-7 items-center gap-[6px] rounded py-[3px] pl-0 pr-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive ? "text-[#25272d]" : "text-[#8f929c]",
                )}
                aria-pressed={isActive}
                onClick={tab.onClick}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    "flex h-7 items-center whitespace-nowrap",
                    isActive && "border-b-2 border-[#74798b]",
                  )}
                >
                  {tab.label}
                </span>
              </button>
            </div>
          );
        })}

        {onSelectViewMode && viewMode && activeMode !== "task" ? (
          <div className="ml-3 flex h-7 shrink-0 items-start gap-1">
            {CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS.map((option) => {
              const isActive = viewMode === option.value;
              const Icon = option.icon;
              return (
                <div
                  key={option.value}
                  className="flex flex-col items-start pb-2"
                >
                  <button
                    type="button"
                    className={cn(
                      "flex h-7 items-center gap-[6px] rounded px-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal transition-colors hover:bg-[#f6f7f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive ? "text-[#25272d]" : "text-[#8f929c]",
                    )}
                    aria-pressed={isActive}
                    onClick={() => onSelectViewMode(option.value)}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span
                      className={cn(
                        "flex h-7 items-center whitespace-nowrap",
                        isActive && "border-b-2 border-[#74798b]",
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-end gap-[6px]">
        {CALENDAR_TOOLBAR_ACTIONS.map((action, index) => {
          const Icon = action.icon;
          const isLast = index === CALENDAR_TOOLBAR_ACTIONS.length - 1;
          return (
            <button
              key={action.label}
              type="button"
              className={cn(
                "flex h-7 items-center gap-[6px] rounded py-[3px] pl-2 text-[length:var(--ds-layout-font-size-meta)] font-medium leading-normal text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isLast ? "pr-0" : "pr-2",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
