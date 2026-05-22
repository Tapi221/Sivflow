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
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { AnimatedCircleCheckbox } from "@/features/calendar/chip/checkbox/AnimatedCircleCheckbox";
import { GoogleAccountChip } from "@/features/calendar/chip/GoogleAccountChip";
import { CalendarIcon, TaskIcon } from "@/components/icons/schedule.icons";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

import { AddGoogleCalendarButton } from "./AddGoogleCalendarButton";
import type {
  CalendarSidebarProps,
  GoogleAccountDisplay,
} from "../schedulePane.types";

const DEFAULT_CALENDAR_COLOR = "#74798b";
const DEFAULT_TASK_LIST_COLOR = "#7c8cf8";
const SIDEBAR_DIVIDER_CLASS = "h-px w-full shrink-0 bg-[#e4e6eb]";
const GOOGLE_ACCOUNT_CHILD_ITEM_CLASS_NAME =
  "flex h-7 w-full items-center gap-2 overflow-hidden rounded-[10px] px-2 pl-5 text-left";
const GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME = "px-5";

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
  mode: "calendar" | "task";
  onToggleCalendar: (calendarId: string) => void;
  onReconnect: () => void;
  onRetry: () => void;
};

const GoogleAccountSection = ({
  account,
  mode,
  onToggleCalendar,
  onReconnect,
  onRetry,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = account.name ?? account.email ?? "Google";
  const isTaskMode = mode === "task";

  return (
    <div className="mt-2 overflow-hidden rounded-[14px] border border-white/70 bg-white/80 p-0.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] backdrop-blur-xl">
      <button
        type="button"
        className="group flex h-7 w-full items-center gap-1.5 rounded-[10px] px-1.5 text-left transition-all duration-150 hover:bg-[#f5f7fb] active:scale-[0.985] active:bg-[#eef2f7]"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <GoogleAccountChip name={accountName} photoUrl={account.photoUrl} />

        {account.email && (
          <span className="truncate text-[11px] font-semibold tracking-wider text-[#8d93a1]">
            {account.email}
          </span>
        )}

        <span
          className={cn(
            "ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#a2a8b3] transition-all duration-200 group-hover:bg-white/80 group-hover:text-[#6b7280]",
            !isOpen && "-rotate-90",
          )}
        >
          <IconChevronRight className="h-3 w-3" />
        </span>
      </button>

      {isOpen && !isTaskMode && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {account.calendars.map((calendar) => {
            const checked = account.selectedCalendarIds.has(calendar.id);

            return (
              <button
                key={calendar.id}
                type="button"
                className={cn(
                  GOOGLE_ACCOUNT_CHILD_ITEM_CLASS_NAME,
                  "transition-all duration-150 hover:bg-[#f5f7fb] active:scale-[0.99] active:bg-[#eef2f7]",
                )}
                onClick={() => onToggleCalendar(calendar.id)}
                aria-pressed={checked}
              >
                <AnimatedCircleCheckbox
                  checked={checked}
                  color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
                />

                <span className="truncate text-[12px] font-medium text-[#24272f]">
                  {calendar.summary}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {isOpen && isTaskMode && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {account.isTaskListsLoading && account.taskLists.length === 0 && (
            <p
              className={cn(
                GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
                "py-1 text-[11px] text-[#8d93a1]",
              )}
            >
              読み込み中…
            </p>
          )}

          {!account.isTaskListsLoading &&
            !account.taskListsError &&
            account.taskLists.length === 0 && (
              <p
                className={cn(
                  GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
                  "py-1 text-[11px] text-[#8d93a1]",
                )}
              >
                Google ToDo リストはありません
              </p>
            )}

          {account.taskLists.map((taskList) => (
            <div
              key={taskList.id}
              className={GOOGLE_ACCOUNT_CHILD_ITEM_CLASS_NAME}
            >
              <AnimatedCircleCheckbox checked color={DEFAULT_TASK_LIST_COLOR} />

              <span className="truncate text-[12px] font-medium text-[#24272f]">
                {taskList.title}
              </span>
            </div>
          ))}

          {account.taskListsError && (
            <div
              className={cn(
                "mt-1 rounded-[12px] bg-[#fff4e5] py-1.5",
                GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
              )}
            >
              <p className="text-[11px] leading-relaxed text-[#9a6700]">
                {account.taskListsError}
              </p>
              <button
                type="button"
                className="mt-1 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#a14d00] shadow-sm transition-colors hover:bg-white"
                onClick={onReconnect}
              >
                再連携
              </button>
            </div>
          )}
        </div>
      )}

      {account.connectionStatus === "needsReconnect" && (
        <div className="mt-1 rounded-[12px] bg-[#fff4e5] px-3 py-1.5">
          <p className="text-[11px] leading-relaxed text-[#9a6700]">
            再連携が必要です。
          </p>
          <button
            type="button"
            className="mt-1 rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-semibold text-[#a14d00] shadow-sm transition-colors hover:bg-white"
            onClick={onReconnect}
          >
            再連携
          </button>
        </div>
      )}

      {account.error && (
        <p className="mt-1 rounded-[12px] bg-[#fff1f0] px-3 py-1.5 text-[11px] leading-relaxed text-[#b42318]">
          {account.error}
        </p>
      )}

      {account.connectionStatus === "error" && (
        <div className="mt-1 px-3 pb-1">
          <button
            type="button"
            className="rounded-full bg-[#fff1f0] px-2.5 py-0.5 text-[11px] font-semibold text-[#b42318] transition-colors hover:bg-[#fee4e2]"
            onClick={onRetry}
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
};

export const CalendarSidebar = ({
  monthDate,
  selectedDate,
  activeMode,
  googleAccounts,
  isAnyCalendarConnecting,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onAddCalendar,
  onReconnectAccount,
  onRetryAccount,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate),
    [monthDate, selectedDate],
  );

  const hasGoogleAccounts = googleAccounts.length > 0;
  const isTaskMode = activeMode === "task";

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent px-3 pb-5 pt-2 text-[#24272f]">
      <section className="flex w-full shrink-0 flex-col rounded-[20px] border border-white/70 bg-white/80 px-2.5 pb-2.5 pt-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.04)] backdrop-blur-2xl">
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="text-[13px] font-bold tracking-[-0.01em] text-[#1f2937]">
            {format(monthDate, monthLabelFormat, { locale: dateFnsLocale })}
          </span>

          <div className="flex items-center gap-1">
            <HoverTooltip label={t.previousMonthLabel} side="top">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#8f96a3] transition-all hover:bg-[#f1f3f7] hover:text-[#1f2937] active:scale-[0.94] active:bg-[#e8ecf3]"
                onClick={onPreviousMonth}
                aria-label={t.previousMonthLabel}
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
            </HoverTooltip>

            <HoverTooltip label={t.nextMonthLabel} side="top">
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#8f96a3] transition-all hover:bg-[#f1f3f7] hover:text-[#1f2937] active:scale-[0.94] active:bg-[#e8ecf3]"
                onClick={onNextMonth}
                aria-label={t.nextMonthLabel}
              >
                <IconChevronRight className="h-4 w-4" />
              </button>
            </HoverTooltip>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 px-0.5">
          {t.miniCalendarWeekdays.map((weekday, index) => (
            <span
              key={`${weekday}-${index}`}
              className="flex h-6 items-center justify-center text-[11px] font-bold uppercase text-[#9aa0aa]"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "flex h-7 w-full items-center justify-center rounded-full transition-all duration-150 active:scale-[0.92]",
                  !isActive && "hover:bg-[#f1f3f7]",
                )}
              >
                <span
                  className={cn(
                    "flex h-[25px] w-[25px] items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-all duration-150",
                    day.isToday &&
                      "bg-[#007aff] text-white shadow-[0_5px_12px_rgba(0,122,255,0.28)]",
                    day.isSelected &&
                      !day.isToday &&
                      "bg-[#1f2937] text-white shadow-[0_4px_10px_rgba(15,23,42,0.2)]",
                    !isActive && day.isCurrentMonth && "text-[#111827]",
                    !isActive && !day.isCurrentMonth && "text-[#c2c7d0]",
                  )}
                >
                  {day.dayNumber}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className={cn("mt-2", SIDEBAR_DIVIDER_CLASS)} />

      <nav className="mt-2 flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
        <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
          {isTaskMode ? (
            <TaskIcon className="h-3.5 w-3.5 text-[#8d93a1]" />
          ) : (
            <CalendarIcon className="h-3.5 w-3.5 text-[#8d93a1]" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#9aa0aa]">
            {isTaskMode ? "MY TODO LISTS" : t.myProjects}
          </span>
        </div>

        {googleAccounts.map((account) => (
          <GoogleAccountSection
            key={account.accountId}
            account={account}
            mode={isTaskMode ? "task" : "calendar"}
            onToggleCalendar={(calendarId) =>
              onToggleCalendar(account.accountId, calendarId)
            }
            onReconnect={() => onReconnectAccount(account.accountId)}
            onRetry={() => onRetryAccount(account.accountId)}
          />
        ))}
      </nav>

      <div className="mt-auto w-full shrink-0">
        {hasGoogleAccounts && (
          <div className={cn("mt-2", SIDEBAR_DIVIDER_CLASS)} />
        )}

        <AddGoogleCalendarButton
          hasGoogleAccounts={hasGoogleAccounts}
          isConnecting={isAnyCalendarConnecting}
          onAddCalendar={onAddCalendar}
        />
      </div>
    </aside>
  );
};
