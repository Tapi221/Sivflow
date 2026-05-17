import {
  addDays,
  addMonths,
  format,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns";
import { ja } from "date-fns/locale";
import type { CSSProperties, UIEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";
import type { IconProps } from "@/ui/icons";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Filter,
  Plus,
  Search,
} from "@/ui/icons";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarTimelineDayView } from "./CalendarTimelineDayView";
import {
  buildTimelineColumns,
  getTimelineAnchorColumnIndex,
  getTimelineColumnWidth,
  type TimelineUnitBuffer,
} from "./CalendarTimelineDayView.shared";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import {
  useGoogleCalendarIntegration,
  type GoogleCalendarEvent,
  type GoogleCalendarListItem,
} from "./useGoogleCalendarIntegration";

/* --------------------------------
 * 基本タイプ
 * -------------------------------- */

type CalendarPaneProps = {
  onClose?: () => void;
};

export type CalendarViewMode = "month" | "week" | "days";
export type CalendarToolbarMode = "calendar" | "timeline";

type TimelineBufferDays = {
  before: number;
  after: number;
};

type TimelineGridStyle = CSSProperties & {
  "--calendar-hour-row-height": string;
};

type CalendarEventStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

const HOURS = Array.from({ length: 24 }, (_, index) => index);

type MiniCalendarDay = {
  date: Date;
  dayNumber: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};

type CalendarSidebarProps = {
  monthDate: Date;
  selectedDate: Date;
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: Set<string>;
  calendarError: string | null;
  isCalendarConnected: boolean;
  isCalendarConnecting: boolean;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onClose: () => void;
  onConnectCalendar: () => void;
  onToggleCalendar: (calendarId: string) => void;
};

/* --------------------------------
 * アイコン
 * -------------------------------- */

const TimelineToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 3H11C11.5523 3 12 3.44772 12 4V5C12 5.55228 11.5523 6 11 6H2C1.44772 6 1 5.55228 1 5V4C1 3.44772 1.44772 3 2 3ZM0 4C0 2.89543 0.895431 2 2 2H11C12.1046 2 13 2.89543 13 4V5C13 6.10457 12.1046 7 11 7H2C0.89543 7 0 6.10457 0 5V4ZM5 10H14C14.5523 10 15 10.4477 15 11V12C15 12.5523 14.5523 13 14 13H5C4.44772 13 4 12.5523 4 12V11C4 10.4477 4.44772 10 5 10ZM3 11C3 9.89543 3.89543 9 5 9H14C15.1046 9 16 9.89543 16 11V12C16 13.1046 15.1046 14 14 14H5C3.89543 14 3 13.1046 3 12V11Z"
      fill="#74798B"
    />
  </svg>
);

const SortToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9337 5.49595L8.00095 2.125L4.06817 5.49595C3.78932 5.73497 3.75703 6.15478 3.99604 6.43363C4.23506 6.71248 4.65487 6.74478 4.93373 6.50576L8.00095 3.87671L11.0682 6.50576C11.347 6.74478 11.7668 6.71248 12.0059 6.43363C12.2449 6.15478 12.2126 5.73497 11.9337 5.49595ZM4.06823 10.506L8.001 13.877L11.9338 10.506C12.2126 10.267 12.2449 9.84717 12.0059 9.56832C11.7669 9.28947 11.3471 9.25717 11.0682 9.49619L8.001 12.1252L4.93378 9.49619C4.65493 9.25717 4.23511 9.28947 3.9961 9.56832C3.75708 9.84717 3.78938 10.267 4.06823 10.506Z"
      fill="#8F929C"
    />
  </svg>
);

const FieldsToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.00094 3.33594C1.63367 3.33594 1.33594 3.63367 1.33594 4.00094C1.33594 4.36821 1.63367 4.66594 2.00094 4.66594H2.0076C2.37487 4.66594 2.6726 4.36821 2.6726 4.00094C2.6726 3.63367 2.37487 3.33594 2.0076 3.33594H2.00094ZM5.33443 3.33594C4.96716 3.33594 4.66943 3.63367 4.66943 4.00094C4.66943 4.36821 4.96716 4.66594 5.33443 4.66594H14.0011C14.3684 4.66594 14.6661 4.36821 14.6661 4.00094C14.6661 3.63367 14.3684 3.33594 14.0011 3.33594H5.33443ZM5.33443 7.33594C4.96716 7.33594 4.66943 7.63367 4.66943 8.00094C4.66943 8.36821 4.96716 8.66594 5.33443 8.66594H14.0011C14.3684 8.66594 14.6661 8.36821 14.6661 8.00094C14.6661 7.63367 14.3684 7.33594 14.0011 7.33594H5.33443ZM4.66943 12.0009C4.66943 11.6337 4.96716 11.3359 5.33443 11.3359H14.0011C14.3684 11.3359 14.6661 11.6337 14.6661 12.0009C14.6661 12.3682 14.3684 12.6659 14.0011 12.6659H5.33443C4.96716 12.6659 4.66943 12.3682 4.66943 12.0009ZM1.33594 8.00094C1.33594 7.63367 1.63367 7.33594 2.00094 7.33594H2.0076C2.37487 7.33594 2.6726 7.63367 2.6726 8.00094C2.6726 8.36821 2.37487 8.66594 2.0076 8.66594H2.00094C1.63367 8.66594 1.33594 8.36821 1.33594 8.00094ZM2.00094 11.3359C1.63367 11.3359 1.33594 11.6337 1.33594 12.0009C1.33594 12.3682 1.63367 12.6659 2.00094 12.6659H2.0076C2.37487 12.6659 2.6726 12.3682 2.6726 12.0009C2.6726 11.6337 2.37487 11.3359 2.0076 11.3359H2.00094Z"
      fill="#74798B"
    />
  </svg>
);

const MonthViewToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="2"
      y="3"
      width="12"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.25" />
    <path d="M6 6.5V13" stroke="currentColor" strokeWidth="1.25" />
    <path d="M10 6.5V13" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const WeekViewToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="2"
      y="3"
      width="12"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path d="M6 3V13" stroke="currentColor" strokeWidth="1.25" />
    <path d="M10 3V13" stroke="currentColor" strokeWidth="1.25" />
  </svg>
);

const DayViewToolbarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="4"
      y="3"
      width="8"
      height="10"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.25"
    />
  </svg>
);

const SidebarCalendarIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M18 2V4M6 2V4M10 17V13.347C10 13.156 9.863 13 9.695 13H9M13.63 17L14.984 13.35C15.047 13.179 14.913 13 14.721 13H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8H18M2.5 12.243C2.5 7.886 2.5 5.707 3.752 4.353C5.004 3 7.02 3 11.05 3H12.95C16.98 3 18.996 3 20.248 4.354C21.5 5.707 21.5 7.886 21.5 12.244V12.757C21.5 17.114 21.5 19.293 20.248 20.647C18.996 22 16.98 22 12.95 22H11.05C7.02 22 5.004 22 3.752 20.646C2.5 19.293 2.5 17.114 2.5 12.756V12.243Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SidebarPanelIcon = ({
  className,
  label: _label,
  size: _size,
  title: _title,
  ...props
}: IconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <rect
      x="2"
      y="2.75"
      width="12"
      height="10.5"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.25"
    />
    <path
      d="M6 3V13"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
    />
  </svg>
);

/* --------------------------------
 * Toolbar
 * -------------------------------- */

export type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  viewMode?: CalendarViewMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectViewMode?: (viewMode: CalendarViewMode) => void;
};

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
  onSelectViewMode,
}: CalendarWorkspaceToolbarProps) => {
  const tabs = [
    {
      value: "calendar",
      label: "Calendar",
      icon: CalendarIcon,
      onClick: onSelectCalendar,
    },
    {
      value: "timeline",
      label: "Timeline",
      icon: TimelineToolbarIcon,
      onClick: onSelectTimeline,
    },
  ] as const;

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

        {onSelectViewMode && viewMode ? (
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

/* --------------------------------
 * Sidebar
 * -------------------------------- */

const buildMiniCalendarDays = (
  monthDate: Date,
  selectedDate: Date,
): MiniCalendarDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = startOfDay(new Date());

  return Array.from({ length: C.MINI_CALENDAR_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);

    return {
      date,
      dayNumber: format(date, "d"),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
    };
  });
};

const CalendarSidebar = ({
  monthDate,
  selectedDate,
  calendars,
  selectedCalendarIds,
  calendarError,
  isCalendarConnected,
  isCalendarConnecting,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onClose,
  onConnectCalendar,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );
  const primaryCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.primary),
    [calendars],
  );
  const secondaryCalendars = useMemo(
    () =>
      primaryCalendars.length > 0
        ? calendars.filter((calendar) => !calendar.primary)
        : calendars,
    [calendars, primaryCalendars.length],
  );
  const calendarSections = useMemo(
    () => [
      {
        label: "My calendars",
        calendars:
          primaryCalendars.length > 0 ? primaryCalendars : secondaryCalendars,
      },
      {
        label: "Other calendars",
        calendars: primaryCalendars.length > 0 ? secondaryCalendars : [],
      },
    ],
    [primaryCalendars, secondaryCalendars],
  );

  return (
    <aside className="flex w-[292px] shrink-0 flex-col gap-6 overflow-y-auto bg-[#f7f8fa] px-3 py-4 text-[#24272f]">
      <section className="flex w-full flex-col gap-3">
        <div className="flex w-full items-center justify-between overflow-hidden px-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc] hover:text-[#20242c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onClose}
              aria-label="Hide calendar sidebar"
              title="Hide calendar sidebar"
            >
              <SidebarPanelIcon className="h-4 w-4" />
            </button>
            <h2 className="truncate text-[16px] font-semibold leading-normal text-[#24272f]">
              {format(monthDate, "MMMM yyyy")}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onPreviousMonth}
              aria-label="Previous month"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#667085] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onNextMonth}
              aria-label="Next month"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 rounded-[16px] bg-[#eef4ff] px-2.5 py-4">
          <div className="grid grid-cols-7 gap-y-2 px-1">
            {T.MINI_CALENDAR_WEEKDAYS.map((weekday, index) => (
              <span
                key={`${weekday}-${index}`}
                className="flex h-4 items-center justify-center text-[13px] font-medium leading-none text-[#667085]"
              >
                {weekday}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-2">
            {miniCalendarDays.map((day) => (
              <button
                key={day.date.toISOString()}
                type="button"
                className={cn(
                  "flex h-7 w-8 items-center justify-center justify-self-center rounded-full text-[14px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  day.isSelected
                    ? "bg-[#accfff] font-semibold text-[#20242c]"
                    : day.isToday
                      ? "bg-[#accfff]/50 text-[#20242c]"
                      : day.isCurrentMonth
                        ? "text-[#20242c] hover:bg-[#accfff]/25"
                        : "text-[#8f929c] hover:bg-[#accfff]/15",
                )}
                onClick={() => onSelectDate(day.date)}
                aria-pressed={day.isSelected}
              >
                {day.dayNumber}
              </button>
            ))}
          </div>
        </div>
      </section>

      <nav className="flex w-full flex-col gap-2" aria-label="Calendar lists">
        {calendarSections.map((section) => {
          if (isCalendarConnected && section.calendars.length === 0) {
            return null;
          }

          return (
            <div key={section.label} className="flex flex-col gap-1">
              <button
                type="button"
                className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-[14px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex shrink-0 items-center">
                  <ChevronDown className="h-4 w-4 text-[#667085]" />
                  <SidebarCalendarIcon className="h-5 w-5 shrink-0 text-black" />
                </span>
                <span className="truncate">{section.label}</span>
              </button>

              {section.calendars.map((calendar) => {
                const checked = selectedCalendarIds.has(calendar.id);
                const Icon = checked ? CheckCircle : Circle;

                return (
                  <button
                    key={calendar.id}
                    type="button"
                    className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-[14px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onToggleCalendar(calendar.id)}
                  >
                    <span className="flex shrink-0 items-center pl-4">
                      <Icon
                        className="h-5 w-5 shrink-0"
                        style={{ color: calendar.backgroundColor }}
                      />
                    </span>
                    <span className="truncate">{calendar.summary}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 overflow-hidden rounded-lg px-2 text-left text-[14px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onConnectCalendar}
          disabled={isCalendarConnecting}
        >
          <Plus className="h-5 w-5 shrink-0 text-black" />
          <span className="truncate">
            {isCalendarConnected
              ? "Reconnect Google Calendar"
              : isCalendarConnecting
                ? "Connecting..."
                : "Add Google Calendar"}
          </span>
        </button>

        {calendarError ? (
          <p className="px-2 pt-1 text-[12px] leading-normal text-[#b42318]">
            {calendarError}
          </p>
        ) : null}
      </nav>
    </aside>
  );
};

/* --------------------------------
 * ユーティリティ
 * -------------------------------- */

const createInitialCalendarBuffer = (): TimelineBufferDays => ({
  before: C.INITIAL_CALENDAR_BUFFER_DAYS,
  after: C.INITIAL_CALENDAR_BUFFER_DAYS,
});

const createInitialTimelineUnitBuffer = (
  viewMode: CalendarViewMode,
): TimelineUnitBuffer => {
  if (viewMode === "month") return { before: 3, after: 8 };
  if (viewMode === "week") return { before: 4, after: 8 };
  return { before: 7, after: 14 };
};

const getTimelineUnitExtendCount = (viewMode: CalendarViewMode) => {
  if (viewMode === "month") return 3;
  if (viewMode === "week") return 4;
  return 7;
};

const getRangeDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return getDaysInMonth(baseDate);
  return viewMode === "week" ? 7 : 1;
};

const getViewportDayCount = (baseDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return 7;
  return getRangeDayCount(baseDate, viewMode);
};

const createVisibleDays = (
  baseDate: Date,
  viewMode: CalendarViewMode,
  timelineBuffer: TimelineBufferDays,
) => {
  const normalizedDate = startOfDay(baseDate);
  const startDate =
    viewMode === "month"
      ? startOfMonth(normalizedDate)
      : viewMode === "week"
        ? startOfWeek(normalizedDate, { weekStartsOn: C.WEEK_STARTS_ON_MONDAY })
        : normalizedDate;
  const visibleDayCount = getRangeDayCount(normalizedDate, viewMode);
  const timelineStartDate = subDays(startDate, timelineBuffer.before);
  const timelineDayCount =
    timelineBuffer.before + visibleDayCount + timelineBuffer.after;

  return Array.from({ length: timelineDayCount }, (_, index) =>
    addDays(timelineStartDate, index),
  );
};

const createHourLabel = (hour: number) => {
  return `${String(hour).padStart(2, "0")}:00`;
};

const calculateEventStyle = (
  event: GoogleCalendarEvent,
): CalendarEventStyle => {
  const startHour =
    event.startsAt.getHours() + event.startsAt.getMinutes() / 60;

  return {
    "--calendar-event-start-hour": Math.max(0, startHour - HOURS[0]),
    "--calendar-event-duration-hours": event.minutes / 60,
    top: `calc(var(--calendar-event-start-hour) * var(--calendar-hour-row-height) + 40px)`,
    height: `calc(var(--calendar-event-duration-hours) * var(--calendar-hour-row-height) - 8px)`,
  };
};

const getNextDate = (currentDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return addMonths(currentDate, 1);
  if (viewMode === "week") return addDays(currentDate, 7);
  return addDays(currentDate, 1);
};

const getPreviousDate = (currentDate: Date, viewMode: CalendarViewMode) => {
  if (viewMode === "month") return subMonths(currentDate, 1);
  if (viewMode === "week") return subDays(currentDate, 7);
  return subDays(currentDate, 1);
};

/* --------------------------------
 * Main Pane
 * -------------------------------- */

export const CalendarPane = ({ onClose: _onClose }: CalendarPaneProps) => {
  const contentViewportRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const prependScrollCorrectionRef = useRef(0);
  const isExtendingLeftRef = useRef(false);
  const isExtendingRightRef = useRef(false);
  const shouldSyncScrollRef = useRef(true);

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [monthTitleDate, setMonthTitleDate] = useState(() =>
    startOfMonth(new Date()),
  );
  const [monthScrollTargetToken, setMonthScrollTargetToken] = useState(0);
  const [selectedViewMode, setSelectedViewMode] =
    useState<CalendarViewMode>("days");
  const [activeMode, setActiveMode] = useState<CalendarToolbarMode>("timeline");
  const [isCalendarSidebarOpen, setIsCalendarSidebarOpen] = useState(true);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [calendarBuffer, setCalendarBuffer] = useState(
    createInitialCalendarBuffer,
  );
  const [timelineUnitBuffer, setTimelineUnitBuffer] = useState(() =>
    createInitialTimelineUnitBuffer("days"),
  );
  const {
    calendars: googleCalendars,
    connect: connectGoogleCalendar,
    error: googleCalendarError,
    events: googleCalendarEvents,
    isConnected: isGoogleCalendarConnected,
    isConnecting: isGoogleCalendarConnecting,
    loadEvents: loadGoogleCalendarEvents,
    selectedCalendarIds,
    selectedCalendarIdList,
    toggleCalendar: toggleGoogleCalendar,
  } = useGoogleCalendarIntegration();

  const visibleDays = useMemo(
    () => createVisibleDays(currentDate, selectedViewMode, calendarBuffer),
    [calendarBuffer, currentDate, selectedViewMode],
  );
  const visibleEvents = googleCalendarEvents;
  const timelineColumns = useMemo(
    () =>
      buildTimelineColumns(selectedViewMode, currentDate, timelineUnitBuffer),
    [currentDate, selectedViewMode, timelineUnitBuffer],
  );
  const timelineColumnWidth = useMemo(
    () => getTimelineColumnWidth(selectedViewMode, C.TIMELINE_DAY_COLUMN_WIDTH),
    [selectedViewMode],
  );
  const timelineAnchorColumnIndex = useMemo(
    () => getTimelineAnchorColumnIndex(timelineColumns, currentDate),
    [currentDate, timelineColumns],
  );

  const titleDate = selectedViewMode === "month" ? monthTitleDate : currentDate;
  const monthLabel =
    activeMode === "timeline" && selectedViewMode === "month"
      ? null
      : format(titleDate, "MMMM yyyy");

  const viewportDayCount = getViewportDayCount(currentDate, selectedViewMode);
  const measuredViewportWidth = viewportWidth;

  const calendarDayColumnWidth =
    measuredViewportWidth > C.TIME_COLUMN_WIDTH
      ? Math.max(
          1,
          (measuredViewportWidth - C.TIME_COLUMN_WIDTH) /
            Math.max(1, viewportDayCount),
        )
      : C.DAY_COLUMN_MIN_WIDTH;

  const gridWidth =
    C.TIME_COLUMN_WIDTH + visibleDays.length * calendarDayColumnWidth;

  useEffect(() => {
    const rangeStart = visibleDays[0];
    const rangeEnd = visibleDays[visibleDays.length - 1];

    if (!rangeStart || !rangeEnd) return;

    void loadGoogleCalendarEvents(rangeStart, rangeEnd);
  }, [loadGoogleCalendarEvents, selectedCalendarIdList, visibleDays]);

  const timelineGridStyle: TimelineGridStyle = {
    "--calendar-hour-row-height": `${C.DEFAULT_HOUR_ROW_HEIGHT}px`,
    gridTemplateColumns: `${C.TIME_COLUMN_WIDTH}px repeat(${visibleDays.length}, ${calendarDayColumnWidth}px)`,
    minWidth: `${gridWidth}px`,
  };

  const resetTimelinePosition = useCallback((viewMode: CalendarViewMode) => {
    shouldSyncScrollRef.current = true;
    setCalendarBuffer(createInitialCalendarBuffer());
    setTimelineUnitBuffer(createInitialTimelineUnitBuffer(viewMode));
  }, []);

  const requestMonthScrollTarget = useCallback(() => {
    setMonthScrollTargetToken((current) => current + 1);
  }, []);

  const handleTimelineScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      const scrollContainer = event.currentTarget;
      const distanceToLeft = scrollContainer.scrollLeft;
      const distanceToRight =
        scrollContainer.scrollWidth -
        scrollContainer.clientWidth -
        scrollContainer.scrollLeft;

      if (
        distanceToLeft < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingLeftRef.current
      ) {
        isExtendingLeftRef.current = true;

        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);
          prependScrollCorrectionRef.current =
            extendCount * timelineColumnWidth;
          setTimelineUnitBuffer((current) => ({
            before: current.before + extendCount,
            after: current.after,
          }));
        } else {
          prependScrollCorrectionRef.current =
            C.CALENDAR_EXTEND_DAYS * calendarDayColumnWidth;
          setCalendarBuffer((current) => ({
            before: current.before + C.CALENDAR_EXTEND_DAYS,
            after: current.after,
          }));
        }
      }

      if (
        distanceToRight < C.TIMELINE_EDGE_THRESHOLD_PX &&
        !isExtendingRightRef.current
      ) {
        isExtendingRightRef.current = true;

        if (activeMode === "timeline") {
          const extendCount = getTimelineUnitExtendCount(selectedViewMode);
          setTimelineUnitBuffer((current) => ({
            before: current.before,
            after: current.after + extendCount,
          }));
        } else {
          setCalendarBuffer((current) => ({
            before: current.before,
            after: current.after + C.CALENDAR_EXTEND_DAYS,
          }));
        }
      }
    },
    [activeMode, calendarDayColumnWidth, selectedViewMode, timelineColumnWidth],
  );

  useEffect(() => {
    const viewport = contentViewportRef.current;
    if (!viewport) return undefined;

    const updateViewportWidth = () => {
      setViewportWidth(viewport.clientWidth);
    };

    updateViewportWidth();
    const observer = new ResizeObserver(updateViewportWidth);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    if (prependScrollCorrectionRef.current > 0) {
      scrollContainer.scrollLeft += prependScrollCorrectionRef.current;
      prependScrollCorrectionRef.current = 0;
      isExtendingLeftRef.current = false;
      return;
    }

    if (!shouldSyncScrollRef.current) return;

    scrollContainer.scrollLeft =
      activeMode === "timeline"
        ? timelineAnchorColumnIndex * timelineColumnWidth
        : calendarBuffer.before * calendarDayColumnWidth;
    shouldSyncScrollRef.current = false;
  }, [
    activeMode,
    calendarBuffer.before,
    calendarDayColumnWidth,
    timelineAnchorColumnIndex,
    timelineColumnWidth,
    timelineColumns.length,
    visibleDays.length,
  ]);

  useLayoutEffect(() => {
    isExtendingRightRef.current = false;
  }, [calendarBuffer.after, timelineUnitBuffer.after]);

  const handleSelectViewMode = (nextViewMode: CalendarViewMode) => {
    setSelectedViewMode(nextViewMode);
    if (nextViewMode === "month") {
      setMonthTitleDate(startOfMonth(currentDate));
      requestMonthScrollTarget();
    }
    resetTimelinePosition(nextViewMode);
  };

  const handleToday = () => {
    const nextDate = new Date();
    setCurrentDate(nextDate);
    setMonthTitleDate(startOfMonth(nextDate));
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  const handlePrevious = () => {
    setCurrentDate((current) => {
      const nextDate = getPreviousDate(current, selectedViewMode);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  const handleNext = () => {
    setCurrentDate((current) => {
      const nextDate = getNextDate(current, selectedViewMode);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  const handleSidebarPreviousMonth = () => {
    setCurrentDate((current) => {
      const nextDate = subMonths(current, 1);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  const handleSidebarNextMonth = () => {
    setCurrentDate((current) => {
      const nextDate = addMonths(current, 1);
      setMonthTitleDate(startOfMonth(nextDate));
      return nextDate;
    });
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  const handleSidebarSelectDate = (date: Date) => {
    setCurrentDate(date);
    setMonthTitleDate(startOfMonth(date));
    if (selectedViewMode === "month") requestMonthScrollTarget();
    resetTimelinePosition(selectedViewMode);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <CalendarWorkspaceToolbar
        activeMode={activeMode}
        viewMode={selectedViewMode}
        onSelectCalendar={() => setActiveMode("calendar")}
        onSelectTimeline={() => setActiveMode("timeline")}
        onSelectViewMode={handleSelectViewMode}
      />

      <div className="flex min-h-0 flex-1 bg-white">
        {isCalendarSidebarOpen ? (
          <CalendarSidebar
            monthDate={currentDate}
            selectedDate={currentDate}
            calendars={googleCalendars}
            selectedCalendarIds={selectedCalendarIds}
            calendarError={googleCalendarError}
            isCalendarConnected={isGoogleCalendarConnected}
            isCalendarConnecting={isGoogleCalendarConnecting}
            onSelectDate={handleSidebarSelectDate}
            onPreviousMonth={handleSidebarPreviousMonth}
            onNextMonth={handleSidebarNextMonth}
            onClose={() => setIsCalendarSidebarOpen(false)}
            onConnectCalendar={connectGoogleCalendar}
            onToggleCalendar={toggleGoogleCalendar}
          />
        ) : null}

        <div
          ref={contentViewportRef}
          className="flex min-w-0 flex-1 flex-col bg-white px-5 pb-5 pt-4"
        >
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {!isCalendarSidebarOpen ? (
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc] hover:text-[#20242c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setIsCalendarSidebarOpen(true)}
                  aria-label="Show calendar sidebar"
                  title="Show calendar sidebar"
                >
                  <SidebarPanelIcon className="h-4 w-4" />
                </button>
              ) : null}

              {monthLabel ? (
                <h1 className="truncate text-[16px] font-semibold text-[#24272f]">
                  {monthLabel}
                </h1>
              ) : (
                <div aria-hidden="true" className="h-6 w-24" />
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
                onClick={handlePrevious}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                type="button"
                className="rounded-lg border border-[#dde2ea] bg-white px-4 py-[7px] text-[14px] font-semibold text-[#20242c] transition-colors hover:bg-[#f8fafc]"
                onClick={handleToday}
              >
                Today
              </button>

              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#dde2ea] bg-white text-[#667085] transition-colors hover:bg-[#f8fafc]"
                onClick={handleNext}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {activeMode === "timeline" ? (
            <CalendarTimelineDayView
              viewMode={selectedViewMode}
              anchorDate={currentDate}
              timelineUnitBuffer={timelineUnitBuffer}
              selectedDate={currentDate}
              dayColumnWidth={C.TIMELINE_DAY_COLUMN_WIDTH}
              laneLabelWidth={C.TIMELINE_LANE_LABEL_WIDTH}
              rowCount={C.TIMELINE_SKELETON_ROW_COUNT}
              scrollContainerRef={scrollContainerRef}
              onScroll={handleTimelineScroll}
              onSelectDate={handleSidebarSelectDate}
            />
          ) : selectedViewMode === "month" ? (
            <CalendarMonthView
              currentDate={currentDate}
              selectedDate={currentDate}
              scrollTargetToken={monthScrollTargetToken}
              onSelectDate={handleSidebarSelectDate}
              onVisibleMonthChange={setMonthTitleDate}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div
                ref={scrollContainerRef}
                className="min-h-0 flex-1 overflow-auto bg-white scrollbar-hidden"
                onScroll={handleTimelineScroll}
              >
                <div className="grid" style={timelineGridStyle}>
                  <div className="sticky left-0 top-0 z-20 border-b border-r border-[#e5e7eb] bg-white" />

                  {visibleDays.map((day) => {
                    const isToday = isSameDay(day, new Date());

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "sticky top-0 z-10 flex h-10 flex-col items-center justify-center border-b border-r border-[#e5e7eb] bg-white text-[12px] font-medium text-[#4c5361] last:border-r-0",
                          isToday && "bg-[#fdf2f2]",
                        )}
                      >
                        <span className="font-semibold text-[#25272d]">
                          {format(day, "d", { locale: ja })}
                        </span>
                        <span>{format(day, "E", { locale: ja })}</span>
                      </div>
                    );
                  })}

                  <div className="sticky left-0 z-10 border-r border-[#e5e7eb] bg-white">
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="flex items-start justify-center border-b border-[#eef0f3] pt-2 text-[12px] text-[#8f929c]"
                        style={{ height: `var(--calendar-hour-row-height)` }}
                      >
                        {createHourLabel(hour)}
                      </div>
                    ))}
                  </div>

                  {visibleDays.map((day) => {
                    const eventsForDay = visibleEvents.filter((event) =>
                      isSameDay(event.startsAt, day),
                    );

                    return (
                      <div
                        key={`${day.toISOString()}-column`}
                        className="relative border-r border-[#eef0f3] last:border-r-0"
                      >
                        {HOURS.map((hour) => (
                          <div
                            key={`${day.toISOString()}-${hour}`}
                            className="border-b border-[#eef0f3]"
                            style={{
                              height: `var(--calendar-hour-row-height)`,
                            }}
                          />
                        ))}

                        {eventsForDay.map((event) => (
                          <div
                            key={event.id}
                            className="absolute left-2 right-2 rounded-md border border-[#bfd3ff] bg-[#dceaff] px-2 py-1 text-[12px] font-medium text-[#2c3440] shadow-sm"
                            style={calculateEventStyle(event)}
                          >
                            {event.title}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
