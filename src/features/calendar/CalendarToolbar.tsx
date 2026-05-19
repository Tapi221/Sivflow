import { cn } from "@/lib/utils";
import { Filter, Search } from "@/ui/icons";
import { useLayoutEffect, useRef, useState } from "react";

import {
  CalendarIcon,
  FieldsToolbarIcon,
  SortToolbarIcon,
  TimelineToolbarIcon,
  DayViewIcon,
  MonthViewIcon,
  WeekViewIcon,
  TaskIcon,
} from "./ui/calendar.icons";

import type {
  CalendarToolbarMode,
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
  { value: "month", label: "Month", icon: MonthViewIcon },
  { value: "week", label: "Week", icon: WeekViewIcon },
  { value: "days", label: "Day", icon: DayViewIcon },
] as const;

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
      icon: TaskIcon,
      onClick: onSelectTask,
    },
  ];

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const viewRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [tabIndicator, setTabIndicator] = useState({ left: 0, width: 0 });
  const [viewIndicator, setViewIndicator] = useState({ left: 0, width: 0 });

  // TAB indicator
  useLayoutEffect(() => {
    const el = tabRefs.current[activeMode];
    if (!el) return;

    setTabIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  }, [activeMode]);

  // VIEW indicator
  useLayoutEffect(() => {
    if (!viewMode) return;

    const el = viewRefs.current[viewMode];
    if (!el) return;

    setViewIndicator({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  }, [viewMode]);

  return (
    <div className="relative flex h-[var(--ds-semantic-breadcrumb-height)] w-full items-center justify-between bg-white overflow-hidden after:absolute after:bottom-1 after:left-0 after:right-0 after:h-px after:bg-[#e2e4e9] after:content-['']">

      {/* LEFT */}
      <div className="flex items-center gap-3">

        {/* TAB GROUP */}
        <div className="relative flex h-7 items-center gap-[6px]">

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.value;

            return (
              <button
                key={tab.value}
                ref={(el) => {
                  tabRefs.current[tab.value] = el;
                }}
                onClick={tab.onClick}
                className={cn(
                  "relative flex h-7 items-center gap-[6px] rounded px-2 w-fit",
                  "text-[12px] font-medium leading-none transition-colors",
                  isActive ? "text-[#25272d]" : "text-[#8f929c]",
                  "hover:bg-[#f6f7f9]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}

          {/* TAB INDICATOR */}
          <span
            className="absolute bottom-[-2px] h-[2px] bg-[#74798b] rounded-full transition-all duration-300 ease-out"
            style={{
              left: tabIndicator.left,
              width: tabIndicator.width,
            }}
          />
        </div>

        {/* VIEW MODE */}
        {onSelectViewMode && viewMode && activeMode !== "task" && (
          <div className="relative flex h-7 items-center gap-1 ml-3">

            {CALENDAR_VIEW_MODE_TOOLBAR_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = viewMode === option.value;

              return (
                <button
                  key={option.value}
                  ref={(el) => {
                    viewRefs.current[option.value] = el;
                  }}
                  onClick={() => onSelectViewMode(option.value)}
                  className={cn(
                    "relative flex h-7 items-center gap-[6px] rounded px-2 w-fit",
                    "text-[12px] font-medium leading-none transition-colors",
                    isActive ? "text-[#25272d]" : "text-[#8f929c]",
                    "hover:bg-[#f6f7f9]"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap">{option.label}</span>
                </button>
              );
            })}

            {/* VIEW INDICATOR */}
            <span
              className="absolute bottom-[-2px] h-[2px] bg-[#74798b] rounded-full transition-all duration-300 ease-out"
              style={{
                left: viewIndicator.left,
                width: viewIndicator.width,
              }}
            />
          </div>
        )}
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex h-7 items-center gap-[6px]">
        {CALENDAR_TOOLBAR_ACTIONS.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.label}
              type="button"
              className="flex h-7 items-center gap-[6px] rounded px-2 text-[12px] font-medium text-[#8f929c] transition-colors hover:bg-[#f6f7f9] hover:text-[#25272d]"
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