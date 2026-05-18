import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import { CheckCircle, ChevronDown, ChevronUp, Circle, Plus } from "@/ui/icons";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";

import { SidebarCalendarIcon, SidebarPanelIcon } from "./calendar.icons";
import type {
  AppCalendarItem,
  CalendarSidebarProps,
} from "./calendarPane.types";

// ── ミニカレンダー構築（純粋関数 → 将来 utils に切り出し可能）
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

// ── アプリ内カレンダー定義（将来: Firestore / ローカルDBから取得）
const APP_CALENDAR_ITEMS: AppCalendarItem[] = [
  { id: "app-calendar-test", label: "Test", color: "#ff3b30", checked: true },
];

export const CalendarSidebar = ({
  monthDate,
  selectedDate,
  calendars,
  googleAccountEmail,
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
  const googleCalendarSectionLabel = googleAccountEmail ?? "Google Calendar";

  // ── セクションの開閉状態
  const [myCalendarsOpen, setMyCalendarsOpen] = useState(true);
  const [googleCalendarOpen, setGoogleCalendarOpen] = useState(true);

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

      <nav className="flex w-full flex-col gap-1" aria-label="Calendar lists">
        {/* ── My calendars セクション */}
        <div className="flex flex-col">
          <button
            type="button"
            className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setMyCalendarsOpen((prev) => !prev)}
            aria-expanded={myCalendarsOpen}
          >
            <span className="flex shrink-0 items-center">
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-[#667085] transition-transform duration-200",
                  !myCalendarsOpen && "-rotate-90",
                )}
              />
              <SidebarCalendarIcon className="h-4 w-4 shrink-0 text-black" />
            </span>
            <span className="truncate">My calendars</span>
          </button>

          {myCalendarsOpen &&
            APP_CALENDAR_ITEMS.map((calendar) => {
              const Icon = calendar.checked ? CheckCircle : Circle;
              return (
                <button
                  key={calendar.id}
                  type="button"
                  className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex shrink-0 items-center pl-3.5">
                    <Icon
                      className="h-4 w-4 shrink-0"
                      style={{ color: calendar.color }}
                    />
                  </span>
                  <span className="truncate">{calendar.label}</span>
                </button>
              );
            })}
        </div>

        {/* ── Google Calendar セクション */}
        {isCalendarConnected ? (
          <div className="flex flex-col">
            <button
              type="button"
              className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={() => setGoogleCalendarOpen((prev) => !prev)}
              aria-expanded={googleCalendarOpen}
            >
              <span className="flex shrink-0 items-center">
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 text-[#667085] transition-transform duration-200",
                    !googleCalendarOpen && "-rotate-90",
                  )}
                />
                <SidebarCalendarIcon className="h-4 w-4 shrink-0 text-black" />
              </span>
              <span className="truncate">{googleCalendarSectionLabel}</span>
            </button>

            {googleCalendarOpen &&
              calendars.map((calendar) => {
                const checked = selectedCalendarIds.has(calendar.id);
                const Icon = checked ? CheckCircle : Circle;
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => onToggleCalendar(calendar.id)}
                  >
                    <span className="flex shrink-0 items-center pl-3.5">
                      <Icon
                        className="h-4 w-4 shrink-0"
                        style={{ color: calendar.backgroundColor }}
                      />
                    </span>
                    <span className="truncate">{calendar.summary}</span>
                  </button>
                );
              })}
          </div>
        ) : null}

        <button
          type="button"
          className="flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md px-2 text-left text-[13px] font-medium leading-normal text-[#24272f] transition-colors hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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