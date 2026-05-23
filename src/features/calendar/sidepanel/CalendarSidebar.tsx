import { useMemo, useState } from "react";
import {
  addDays,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { AddGoogleCalendarButton } from "@/chip/button/AddGoogleCalendarButton";
import { AnimatedCircleCheckbox } from "@/chip/checkbox/AnimatedCircleCheckbox";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { GcalRelinkPanel } from "@/chip/minipanel/GcalRelinkPanel";
import { CalendarIcon, TaskIcon } from "@/components/icons/schedule.icons";
import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

import type {
  CalendarSidebarProps,
  GoogleAccountDisplay,
} from "../schedulePane.types";

const DEFAULT_CALENDAR_COLOR = "#74798b";
const DEFAULT_TASK_LIST_COLOR = "#7c8cf8";
const SIDEBAR_DIVIDER_CLASS = "h-px w-full shrink-0 bg-[#eeeeee]";
const MINI_CALENDAR_NAV_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded-full text-[#b7b7b7] transition-all hover:bg-[#f7f7f7] hover:text-[#8c8c8c] active:scale-[0.94] active:bg-[#f1f1f1]";
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
};

const GoogleAccountSection = ({
  account,
  mode,
  onToggleCalendar,
  onReconnect,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = account.name ?? account.email ?? "Google";
  const isTaskMode = mode === "task";
  const hasNoTaskLists =
    !account.isTaskListsLoading &&
    !account.taskListsError &&
    account.taskLists.length === 0;

  return (
    <div className="mt-2">
      <button
        type="button"
        className="group flex h-7 w-full items-center gap-1.5 rounded-[10px] px-1.5 text-left transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <GoogleAccountChip name={accountName} photoUrl={account.photoUrl} />

        {account.email && (
          <span className="truncate text-[11px] font-semibold tracking-wider text-[#9a9a9a]">
            {account.email}
          </span>
        )}

        <span
          className={cn(
            "ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all duration-200 group-hover:bg-white group-hover:text-[#8c8c8c]",
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
                  "transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]",
                )}
                onClick={() => onToggleCalendar(calendar.id)}
                aria-pressed={checked}
              >
                <AnimatedCircleCheckbox
                  checked={checked}
                  color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
                />

                <span className="truncate text-[12px] font-medium text-[#2f2f2f]">
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
                "py-1 text-[11px] text-[#9a9a9a]",
              )}
            >
              読み込み中…
            </p>
          )}

          {hasNoTaskLists && (
            <p
              className={cn(
                GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
                "py-1 text-[11px] text-[#9a9a9a]",
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

              <span className="truncate text-[12px] font-medium text-[#2f2f2f]">
                {taskList.title}
              </span>
            </div>
          ))}
        </div>
      )}

      {account.connectionStatus === "needsReconnect" && (
        <GcalRelinkPanel onReconnect={onReconnect} />
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
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent pb-5 pl-0 pr-3 pt-2 text-[#2f2f2f]">
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="ml-3 text-[13px] font-bold tracking-[-0.01em] text-[#2f2f2f]">
            {format(monthDate, monthLabelFormat, { locale: dateFnsLocale })}
          </span>

          <div className="flex items-center gap-1">
            <HoverTooltip label={t.previousMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
                onClick={onPreviousMonth}
                aria-label={t.previousMonthLabel}
              >
                <IconChevronLeft className="h-4 w-4" />
              </button>
            </HoverTooltip>

            <HoverTooltip label={t.nextMonthLabel} side="top">
              <button
                type="button"
                className={MINI_CALENDAR_NAV_BUTTON_CLASS_NAME}
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
              className="flex h-6 items-center justify-center text-[11px] font-bold uppercase text-[#8c8c8c]"
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
                  !isActive && "hover:bg-[#f7f7f7]",
                )}
              >
                <CalendarDayNumberCircle
                  isToday={day.isToday}
                  isSelected={day.isSelected}
                  isCurrentMonth={day.isCurrentMonth}
                  className={cn(
                    !day.isCurrentMonth && !isActive && "text-[#b7b7b7]",
                  )}
                >
                  {day.dayNumber}
                </CalendarDayNumberCircle>
              </button>
            );
          })}
        </div>
      </section>

      <div className={cn("mt-2", SIDEBAR_DIVIDER_CLASS)} />

      <nav className="mt-2 flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
        <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
          {isTaskMode ? (
            <TaskIcon className="h-3.5 w-3.5 text-[#9a9a9a]" />
          ) : (
            <CalendarIcon className="h-3.5 w-3.5 text-[#9a9a9a]" />
          )}
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#9a9a9a]">
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