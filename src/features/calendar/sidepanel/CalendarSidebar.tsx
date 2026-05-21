import { useMemo, useState } from "react";
import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { AnimatedCircleCheckbox } from "@/features/calendar/chip/checkbox/AnimatedCircleCheckbox";
import { CalendarIcon, PlusIcon } from "@/components/icons/schedule.icons";
import { cn } from "@/lib/utils";

import type { CalendarSidebarProps, GoogleAccountDisplay } from "../schedulePane.types";

const DEFAULT_CALENDAR_COLOR = "#74798b";

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

type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  onToggleCalendar: (calendarId: string) => void;
  onReconnect: () => void;
  onRetry: () => void;
  onRemove: () => void;
};

const GoogleAccountSection = ({
  account,
  onToggleCalendar,
  onReconnect,
  onRetry,
  onRemove,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const syncIndicator =
    account.syncState === "syncing" ? (
      <IconSync className="h-3 w-3 shrink-0 animate-spin text-[#185FA5]" />
    ) : account.connectionStatus === "needsReconnect" ? (
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#f59e0b]" />
    ) : account.syncState === "error" ? (
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e53e3e]" />
    ) : null;

  return (
    <div className="mt-3">
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

        {account.lastSyncedAt && (
          <span className="ml-auto shrink-0 text-[10px] font-medium text-[#b0b5bf]">
            {format(account.lastSyncedAt, "HH:mm")}
          </span>
        )}

        <span
          className={cn(
            "flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200",
            !account.lastSyncedAt && "ml-auto",
            !isOpen && "-rotate-90",
          )}
        >
          <IconChevronRight className="h-3 w-3 text-[#9aa0aa]" />
        </span>
      </button>

      {isOpen &&
        account.calendars.map((calendar) => {
          const checked = account.selectedCalendarIds.has(calendar.id);

          return (
            <button
              key={calendar.id}
              type="button"
              className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 pl-7 text-left transition-colors hover:bg-[#eceef1]"
              onClick={() => onToggleCalendar(calendar.id)}
              aria-pressed={checked}
            >
              <AnimatedCircleCheckbox
                checked={checked}
                color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
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

      {account.connectionStatus === "needsReconnect" && (
        <div className="mt-1 px-2">
          <p className="text-[11px] leading-relaxed text-[#a16207]">
            再連携が必要です。
          </p>
          <button
            type="button"
            className="mt-1 rounded-md bg-[#fff7ed] px-2 py-1 text-[11px] font-semibold text-[#9a3412] hover:bg-[#ffedd5]"
            onClick={onReconnect}
          >
            再連携
          </button>
        </div>
      )}

      {account.error && (
        <p className="mt-1 px-2 text-[11px] leading-relaxed text-[#b42318]">
          {account.error}
        </p>
      )}

      {account.connectionStatus === "error" && (
        <div className="mt-1 px-2">
          <button
            type="button"
            className="rounded-md bg-[#fef2f2] px-2 py-1 text-[11px] font-semibold text-[#b42318] hover:bg-[#fee2e2]"
            onClick={onRetry}
          >
            再試行
          </button>
        </div>
      )}

      <div className="mt-1 px-2">
        <button
          type="button"
          className="text-[11px] font-medium text-[#9aa0aa] hover:text-[#b42318]"
          onClick={onRemove}
        >
          接続解除
        </button>
      </div>
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
  onReconnectAccount,
  onRetryAccount,
  onRemoveAccount,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  const hasGoogleAccounts = googleAccounts.length > 0;

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-[#f7f8fa] px-3 py-5 text-[#24272f]">
      <section className="flex w-full shrink-0 flex-col gap-2">
        <div className="flex w-full items-center justify-between px-1">
          <span className="text-[12px] font-semibold tracking-wide text-[#3d4049]">
            {format(monthDate, "MMMM yyyy")}
          </span>

          <div className="flex items-center gap-0.5">
            <HoverTooltip label="前の月" side="top">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] hover:bg-[#eceef1]"
                onClick={onPreviousMonth}
                aria-label="前の月"
              >
                <IconChevronLeft className="h-3.5 w-3.5" />
              </button>
            </HoverTooltip>

            <HoverTooltip label="次の月" side="top">
              <button
                type="button"
                className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] hover:bg-[#eceef1]"
                onClick={onNextMonth}
                aria-label="次の月"
              >
                <IconChevronRight className="h-3.5 w-3.5" />
              </button>
            </HoverTooltip>
          </div>
        </div>

        <div className="grid grid-cols-7 px-0.5">
          {T.MINI_CALENDAR_WEEKDAYS.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="flex h-6 items-center justify-center text-[11px] font-semibold uppercase text-[#9aa0aa]"
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
                  "flex h-7 w-full items-center justify-center rounded-md transition-colors",
                  !isActive && "hover:bg-[#eceef1]",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums",
                    day.isToday &&
                      "bg-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.35)]",
                    day.isSelected &&
                      !day.isToday &&
                      "bg-[#2d3039] text-white",
                    !isActive && day.isCurrentMonth && "text-[#24231f]",
                    !isActive && !day.isCurrentMonth && "text-[#b8bcc5]",
                  )}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-5 h-px w-full shrink-0 bg-[#e4e6eb]" />

      <nav className="mt-5 flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto">
        <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 text-[#74798b]" />
          <span className="text-[11px] font-semibold uppercase text-[#9aa0aa]">
            My Projects
          </span>
        </div>

        {googleAccounts.map((account) => (
          <GoogleAccountSection
            key={account.accountId}
            account={account}
            onToggleCalendar={(calendarId) =>
              onToggleCalendar(account.accountId, calendarId)
            }
            onReconnect={() => onReconnectAccount(account.accountId)}
            onRetry={() => onRetryAccount(account.accountId)}
            onRemove={() => onRemoveAccount(account.accountId)}
          />
        ))}

        <div className={cn("mt-2 shrink-0", hasGoogleAccounts && "border-t pt-2")}>
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
