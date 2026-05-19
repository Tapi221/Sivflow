import {
  CalendarIcon,
  TimelineToolbarIcon,
  TaskIcon,
  MonthViewIcon,
  WeekViewIcon,
  DayViewIcon,
} from "../../ui/calendar.icons";

export type CalendarViewMode = "month" | "week" | "days";

type Params = {
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectTask: () => void;
  onSelectViewMode?: (mode: CalendarViewMode) => void;
};

export const useCalendarToolbar = ({
  onSelectCalendar,
  onSelectTimeline,
  onSelectTask,
  onSelectViewMode,
}: Params) => {
  const tabs = [
    {
      value: "calendar" as const,
      label: "Calendar",
      icon: CalendarIcon,
      onClick: onSelectCalendar,
    },
    {
      value: "timeline" as const,
      label: "Timeline",
      icon: TimelineToolbarIcon,
      onClick: onSelectTimeline,
    },
    {
      value: "task" as const,
      label: "Task",
      icon: TaskIcon,
      onClick: onSelectTask,
    },
  ] as const;

  const viewOptions = [
    {
      value: "month" as const,
      label: "Month",
      icon: MonthViewIcon,
      onClick: () => onSelectViewMode?.("month"),
    },
    {
      value: "week" as const,
      label: "Week",
      icon: WeekViewIcon,
      onClick: () => onSelectViewMode?.("week"),
    },
    {
      value: "days" as const,
      label: "Day",
      icon: DayViewIcon,
      onClick: () => onSelectViewMode?.("days"),
    },
  ] as const;

  const actions = [
    { key: "search", label: "Search" },
    { key: "filter", label: "Filter" },
    { key: "sort", label: "Sort" },
    { key: "fields", label: "Fields" },
  ] as const;

  return {
    tabs,
    viewOptions,
    actions,
  };
};