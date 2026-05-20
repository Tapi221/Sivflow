import { useMemo, useState } from "react";

import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";

import type {
  AppCalendarItem,
  CalendarSidebarProps,
  GoogleAccountDisplay,
} from "../calendarPane.types";
import {
  CalendarIcon,
  CheckCircleFilledIcon,
  CircleOutlineIcon,
  PlusIcon,
} from "../ui/calendar.icons";

import { cn } from "@/lib/utils";


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

const IconSync = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M13.5 8A5.5 5.5 0 1 1 8 2.5M13.5 2.5V6H10"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  onToggleCalendar: (calendarId: string) => void;
  onRemove: () => void;
};

const GoogleAccountSection = ({
  account,
  onToggleCalendar,
  onRemove,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const syncIndicator =
    account.syncState === "syncing" ? (
      <IconSync className="h-3 w-3 shrink-0 animate-spin text-[#185FA5]" />
    ) : account.syncState === "error" ? (
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e53e3e]" />
    ) : null;

  return (
    <div className="mt-3">
      {/* ヘッダー行：カレンダーアイコン + トグル + メール(小文字) */}
<button
  type="button"
  className="group flex h-6 w-full items-center gap-1 px-2 text-left"
  onClick={() => setIsOpen((v) => !v)}
  aria-expanded={isOpen}
>
  <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#74798b]" />
  {account.email && (
    <span className="truncate text-[11px] font-semibold tracking-wider text-[#9aa0aa]">
      {account.email}
    </span>
  )}
  {syncIndicator}
  <span
    className={cn(
      "ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200",
      !isOpen && "-rotate-90",
    )}
  >
    <IconChevronRight className="h-3 w-3 text-[#9aa0aa]" />
  </span>
</button>

      {/* カレンダー一覧 */}
      {isOpen &&
        account.calendars.map((calendar) => {
          const checked = account.selectedCalendarIds.has(calendar.id);
          const Icon = checked ? CheckCircleFilledIcon : CircleOutlineIcon;

          return (
            <button
              key={calendar.id}
              type="button"
              className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 pl-7 text-left transition-colors hover:bg-[#eceef1]"
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

      {isOpen && account.calendars.length === 0 && (
        <p className="px-7 py-1 text-[11px] text-[#b0b5bf]">
          {account.syncState === "syncing" ? (
            <span className="flex items-center gap-1">
              <IconSync className="h-3 w-3 animate-spin" />
              読み込み中…
            </span>
          ) : null}
        </p>
      )}

      {account.error && (
        <p className="mt-1 px-2 text-[11px] leading-relaxed text-[#b42318]">
          {account.error}
        </p>
      )}
    </div>
  );
};

export const CalendarSidebar = ({
  monthDate,
  selectedDate,
  googleAccounts,
  isAnyCalendarConnecting,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onAddCalendar,
  onRemoveAccount,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  const hasGoogleAccounts = googleAccounts.length > 0;

  return (
    <aside className="flex w-[220px] shrink-0 flex-col gap-5 overflow-y-auto bg-[#f7f8fa] px-3 py-5 text-[#24272f]">
      {/* ミニカレンダー */}
      <section className="flex w-full flex-col gap-2">
        <div className="flex w-full items-center justify-between px-1">
          <span className="text-[12px] font-semibold tracking-wide text-[#3d4049]">
            {format(monthDate, "MMMM yyyy")}
          </span>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] hover:bg-[#eceef1]"
              onClick={onPreviousMonth}
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] hover:bg-[#eceef1]"
              onClick={onNextMonth}
            >
              <IconChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 px-0.5">
          {T.MINI_CALENDAR_WEEKDAYS.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="flex h-6 items-center justify-center text-[10px] font-medium uppercase text-[#b0b5bf]"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "flex aspect-square w-full items-center justify-center rounded-full text-[11px]",
                  day.isToday && "bg-[#185FA5] text-white",
                  day.isSelected && !day.isToday && "bg-[#2d3039] text-white",
                  !isActive &&
                    day.isCurrentMonth &&
                    "hover:bg-[#eceef1] text-[#2d3039]",
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

      <div className="h-px w-full bg-[#e4e6eb]" />

      {/* カレンダーリスト */}
      <nav className="flex w-full flex-col gap-0.5">
        <div className="mb-1 flex h-6 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 text-[#74798b]" />
          <span className="text-[11px] font-semibold uppercase text-[#9aa0aa]">
            My Calendars
          </span>
        </div>

        {googleAccounts.map((account) => (
          <GoogleAccountSection
            key={account.accountId}
            account={account}
            onToggleCalendar={(calendarId) =>
              onToggleCalendar(account.accountId, calendarId)
            }
            onRemove={() => onRemoveAccount(account.accountId)}
          />
        ))}

        <div className={cn("mt-2", hasGoogleAccounts && "pt-2 border-t")}>
          <button
            type="button"
            className="flex h-7 w-full items-center gap-2 px-2 text-left hover:bg-[#eceef1]"
            onClick={onAddCalendar}
            disabled={isAnyCalendarConnecting}
          >
            <PlusIcon className="h-4 w-4 text-[#74798b]" />
            <span className="text-[12px] text-[#74798b]">
              {isAnyCalendarConnecting
                ? "接続中…"
                : hasGoogleAccounts
                  ? "別のアカウントを追加"
                  : "Google Calendar を追加"}
            </span>
          </button>
        </div>
      </nav>
    </aside>
  );
};
