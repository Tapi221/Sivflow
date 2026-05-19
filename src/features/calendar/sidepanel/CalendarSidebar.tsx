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
import { CheckCircle, ChevronLeft, ChevronRight, Circle } from "@/ui/icons";
import { PlusIcon, CalendarIcon } from "../ui/calendar.icons";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import type {
  AppCalendarItem,
  CalendarSidebarProps,
} from "../calendarPane.types";

// ────────────────────────────────────────
// ChevronLeft / ChevronRight を ui/icons から
// インポートしていない場合はインライン SVG で代替
// ────────────────────────────────────────
const IconChevronLeft = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M10 12L6 8L10 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ────────────────────────────────────────
// Mini calendar helpers
// ────────────────────────────────────────

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

const APP_CALENDAR_ITEMS: AppCalendarItem[] = [
  { id: "app-calendar-test", label: "Test", color: "#ff3b30", checked: true },
];

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

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
  onConnectCalendar,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  const googleCalendarSectionLabel = googleAccountEmail ?? "Google Calendar";
  const [googleCalendarOpen, setGoogleCalendarOpen] = useState(true);

  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-5 overflow-y-auto bg-[#f7f8fa] px-3 py-5 text-[#24272f]">

      {/* ── Mini Calendar ─────────────────────── */}
      <section className="flex w-full flex-col gap-2">

        {/* Month label + navigation */}
        <div className="flex w-full items-center justify-between px-1">
          <span className="text-[12px] font-semibold tracking-wide text-[#3d4049]">
            {format(monthDate, "MMMM yyyy")}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] transition-colors hover:bg-[#e8eaee] hover:text-[#3d4049] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onPreviousMonth}
              aria-label="Previous month"
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] transition-colors hover:bg-[#e8eaee] hover:text-[#3d4049] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onNextMonth}
              aria-label="Next month"
            >
              <IconChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 px-0.5">
          {T.MINI_CALENDAR_WEEKDAYS.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="flex h-6 items-center justify-center text-[10px] font-medium uppercase tracking-wider text-[#b0b5bf]"
            >
              {weekday}
            </span>
          ))}
        </div>

        {/* Day cells — no border wrapper, floats on sidebar bg */}
        <div className="grid grid-cols-7 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                aria-pressed={day.isSelected}
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  // base layout
                  "flex aspect-square w-full items-center justify-center rounded-full",
                  "text-[11px] font-medium leading-none",
                  "transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  // today → blue filled
                  day.isToday &&
                    "bg-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.35)]",
                  // selected (not today) → charcoal filled
                  day.isSelected &&
                    !day.isToday &&
                    "bg-[#2d3039] text-white",
                  // default current month
                  !isActive &&
                    day.isCurrentMonth &&
                    "text-[#2d3039] hover:bg-[#e8eaee]",
                  // out-of-month
                  !isActive &&
                    !day.isCurrentMonth &&
                    "text-[#c5c8d0] hover:bg-[#eceef1]",
                )}
              >
                {day.dayNumber}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Divider ───────────────────────────── */}
      <div className="h-px w-full bg-[#e4e6eb]" />

      {/* ── Calendar lists ────────────────────── */}
      <nav className="flex w-full flex-col gap-0.5" aria-label="Calendar lists">

        {/* My Calendars header */}
        <div className="mb-1 flex h-6 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#74798b]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa0aa]">
            My Calendars
          </span>
        </div>

        {APP_CALENDAR_ITEMS.map((calendar) => {
          const Icon = calendar.checked ? CheckCircle : Circle;
          return (
            <button
              key={calendar.id}
              type="button"
              className="group flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left transition-colors hover:bg-[#e8eaee] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <span className="flex shrink-0 items-center">
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: calendar.color }}
                />
              </span>
              <span className="truncate text-[12px] font-medium text-[#3d4049]">
                {calendar.label}
              </span>
            </button>
          );
        })}

        {/* Google Calendar section */}
        {isCalendarConnected && (
          <>
            <div className="mt-3 mb-1 flex h-6 items-center gap-1.5 px-2">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#74798b]" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa0aa]">
                Google
              </span>
            </div>

            <button
              type="button"
              className="group flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left transition-colors hover:bg-[#e8eaee] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={() => setGoogleCalendarOpen((prev) => !prev)}
              aria-expanded={googleCalendarOpen}
            >
              {/* Animated chevron */}
              <span
                className={cn(
                  "flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200",
                  !googleCalendarOpen && "-rotate-90",
                )}
              >
                <IconChevronRight className="h-3 w-3 text-[#9aa0aa]" />
              </span>
              <span className="truncate text-[12px] font-medium text-[#3d4049]">
                {googleCalendarSectionLabel}
              </span>
            </button>

            {googleCalendarOpen &&
              calendars.map((calendar) => {
                const checked = selectedCalendarIds.has(calendar.id);
                const Icon = checked ? CheckCircle : Circle;
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 pl-5 text-left transition-colors hover:bg-[#e8eaee] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    onClick={() => onToggleCalendar(calendar.id)}
                  >
                    <Icon
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: calendar.backgroundColor }}
                    />
                    <span className="truncate text-[12px] font-medium text-[#3d4049]">
                      {calendar.summary}
                    </span>
                  </button>
                );
              })}
          </>
        )}

        {/* ── Add / Reconnect button ─── */}
        <div className="mt-2">
          <button
            type="button"
            className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left transition-colors hover:bg-[#e8eaee] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={onConnectCalendar}
            disabled={isCalendarConnecting}
          >
            <PlusIcon className="h-4 w-4 shrink-0 text-[#74798b]" />
            <span className="truncate text-[12px] font-medium text-[#74798b]">
              {isCalendarConnected
                ? "Reconnect Google Calendar"
                : isCalendarConnecting
                  ? "Connecting…"
                  : "Add Google Calendar"}
            </span>
          </button>
        </div>

        {/* Error */}
        {calendarError && (
          <p className="mt-1 px-2 text-[11px] leading-relaxed text-[#b42318]">
            {calendarError}
          </p>
        )}
      </nav>
    </aside>
  );
};