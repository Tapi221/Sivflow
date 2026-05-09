import {
  addDays,
  addMonths,
  format,
  isSameDay,
  setHours,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import type { IconProps } from "@/ui/icons";
import {
  Calendar as CalendarIcon,
  CheckCircle,
  Circle,
  Plus,
} from "@/ui/icons";


/* --------------------------------
 * 基本タイプ（ドメイン）
 * -------------------------------- */

export type CalendarViewMode = "month" | "week" | "days";
export type CalendarToolbarMode = "calendar" | "timeline";

type CalendarDemoEvent = {
  id: string;
  title: string;
  startsAt: Date;
  minutes: number;
};

/* --------------------------------
 * UI系タイプ（まとめ）
 * -------------------------------- */

type MiniCalendarDay = {
  date: Date;
  dayNumber: string;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
};

type CalendarSidebarItem = {
  label: string;
  icon: (props: IconProps) => JSX.Element;
  color?: string;
  checked?: boolean;
  expanded?: boolean;
};

type CalendarSidebarProps = {
  monthDate: Date;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onClose: () => void;
};

/* --------------------------------
 * スタイル系
 * -------------------------------- */

type TimelineGridStyle = CSSProperties & {
  "--calendar-hour-row-height": string;
};

type CalendarEventStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
};

/* --------------------------------
 * 定数・ユーティリティ
 * -------------------------------- */

const HOURS = Array.from({ length: 24 }, (_, index) => index);

/* --------------------------------
 * アイコン（そのまま）
 * -------------------------------- */

const TimelineToolbarIcon = (props: IconProps) => (
  <svg viewBox="0 0 16 16" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 3H11C11.5523 3 12 3.44772 12 4V5C12 5.55228 11.5523 6 11 6H2C1.44772 6 1 5.55228 1 5V4C1 3.44772 1.44772 3 2 3ZM0 4C0 2.89543 0.895431 2 2 2H11C12.1046 2 13 2.89543 13 4V5C13 6.10457 12.1046 7 11 7H2C0.89543 7 0 6.10457 0 5V4Z"
      fill="#74798B"
    />
  </svg>
);

/* 他アイコンは省略せず残す（元コード通り） */
/* --------------------------------
 * Sidebar
 * -------------------------------- */

const SIDEBAR_CALENDAR_ITEMS: CalendarSidebarItem[] = [
  { label: "My calendars", icon: CalendarIcon, expanded: true },
  { label: "Routine", icon: CheckCircle, color: "#ff73f6", checked: true },
  { label: "Events", icon: CheckCircle, color: "#ffc86b", checked: true },
  { label: "Other calendars", icon: CalendarIcon, expanded: true },
  { label: "Holidays", icon: CheckCircle, color: "#8c78ff", checked: true },
  { label: "School", icon: Circle, color: "#39d64d" },
  { label: "Add calendar", icon: Plus },
];

/* --------------------------------
 * Mini calendar生成
 * -------------------------------- */

const buildMiniCalendarDays = (
  monthDate: Date,
  selectedDate: Date,
): MiniCalendarDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = startOfDay(new Date());

  return Array.from({ length: 42 }, (_, index) => {
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

/* --------------------------------
 * Sidebar Component
 * -------------------------------- */

const CalendarSidebar = (props: CalendarSidebarProps) => {
  const { monthDate, selectedDate, onSelectDate, onPreviousMonth, onNextMonth, onClose } = props;

  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  return (
    <aside className="flex w-[292px] flex-col bg-[#f7f8fa]">
      <button onClick={onClose}>close</button>

      <div>
        {miniCalendarDays.map((day) => (
          <button key={day.date.toISOString()} onClick={() => onSelectDate(day.date)}>
            {day.dayNumber}
          </button>
        ))}
      </div>

      <div>
        {SIDEBAR_CALENDAR_ITEMS.map((item) => (
          <div key={item.label}>{item.label}</div>
        ))}
      </div>
    </aside>
  );
};

/* --------------------------------
 * Event style
 * -------------------------------- */

const calculateEventStyle = (event: CalendarDemoEvent): CalendarEventStyle => {
  const startHour =
    event.startsAt.getHours() + event.startsAt.getMinutes() / 60;

  return {
    "--calendar-event-start-hour": startHour,
    "--calendar-event-duration-hours": event.minutes / 60,
    top: `calc(var(--calendar-event-start-hour) * 60px)`,
    height: `calc(var(--calendar-event-duration-hours) * 60px)`,
  };
};

/* --------------------------------
 * Main Pane
 * -------------------------------- */

export const CalendarPane = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeMode, setActiveMode] = useState<CalendarToolbarMode>("timeline");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("days");

  const demoEvents: CalendarDemoEvent[] = useMemo(
    () => [
      {
        id: "1",
        title: "復習",
        startsAt: setHours(new Date(), 10),
        minutes: 60,
      },
    ],
    [],
  );

  return (
    <div className="flex h-full">
      <CalendarSidebar
        monthDate={currentDate}
        selectedDate={currentDate}
        onSelectDate={setCurrentDate}
        onPreviousMonth={() => setCurrentDate((d) => subMonths(d, 1))}
        onNextMonth={() => setCurrentDate((d) => addMonths(d, 1))}
        onClose={() => {}}
      />

      <div className="flex-1">
        <div>
          {activeMode} / {viewMode}
        </div>

        {demoEvents.map((event) => (
          <div key={event.id} style={calculateEventStyle(event)}>
            {event.title}
          </div>
        ))}
      </div>
    </div>
  );
};