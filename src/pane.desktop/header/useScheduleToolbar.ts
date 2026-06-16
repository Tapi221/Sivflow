type CalendarViewMode = "month" | "week" | "days";
type Params = {
  onSelectCalendar: () => void;
  onSelectTask: () => void;
  onSelectViewMode?: (mode: CalendarViewMode) => void;
};



const useCalendarToolbar = ({ onSelectCalendar, onSelectTask, onSelectViewMode }: Params) => {
  const tabs = [{ value: "calendar" as const, label: "Calendar", onClick: onSelectCalendar }, { value: "task" as const, label: "Task", onClick: onSelectTask }] as const;

  const viewOptions = [
    {
      value: "month" as const,
      label: "Month",
      onClick: () => onSelectViewMode?.("month"),
    },
    {
      value: "week" as const,
      label: "Week",
      onClick: () => onSelectViewMode?.("week"),
    },
    {
      value: "days" as const,
      label: "Day",
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



export { useCalendarToolbar };


export type { CalendarViewMode };
