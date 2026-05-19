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
import {
  PlusIcon,
  CalendarIcon,
  CheckCircleFilledIcon,
  CircleOutlineIcon,
} from "../ui/calendar.icons";

import * as C from "@/features/calendar/calendar.constants.desktop";
import * as T from "@/features/calendar/calendar.text";

import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import type {
  AppCalendarItem,
  CalendarSidebarProps,
  GoogleAccountDisplay,
} from "../calendarPane.types";

// ─────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────

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

const IconTrash = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M2 4h12M6 4V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V4M5.5 4v8.5a.5.5 0 0 0 .5.5h4a.5.5 0 0 0 .5-.5V4"
      stroke="currentColor"
      strokeWidth="1.25"
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

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// GoogleAccountSection
// ─────────────────────────────────────────────────────────────

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const label = account.email ?? "Google Calendar";

  const syncIndicator =
    account.syncState === "syncing" ? (
      <IconSync className="h-3 w-3 shrink-0 animate-spin text-[#185FA5]" />
    ) : account.syncState === "error" ? (
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e53e3e]" />
    ) : null;

  return (
    <div className="mt-3">
      {/* アカウントヘッダー行 */}
      <div className="group flex h-6 w-full items-center gap-1 px-2">
        <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#74798b]" />
        <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wider text-[#9aa0aa]">
          Google
        </span>
        {syncIndicator}
      </div>

      {/* アカウント行（展開トグル + 削除ボタン） */}
      <div className="group flex h-7 w-full items-center gap-1 rounded-md px-2 hover:bg-[#eceef1]">
        <button
          type="button"
          className="flex flex-1 min-w-0 items-center gap-1.5 text-left"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
        >
          <span
            className={cn(
              "flex h-3.5 w-3.5 shrink-0 items-center justify-center transition-transform duration-200",
              !isOpen && "-rotate-90",
            )}
          >
            <IconChevronRight className="h-3 w-3 text-[#9aa0aa]" />
          </span>
          <span className="truncate text-[12px] font-medium text-[#3d4049]">
            {label}
          </span>
        </button>

        {/* 削除ボタン */}
        {!showDeleteConfirm ? (
          <button
            type="button"
            title="このアカウントを削除"
            className="hidden h-5 w-5 shrink-0 items-center justify-center rounded text-[#9aa0aa] hover:bg-[#fce8e8] hover:text-[#c53030] group-hover:flex"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-1 text-[10px]">
            <button
              type="button"
              className="rounded px-1 py-0.5 font-medium text-[#c53030] hover:bg-[#fce8e8]"
              onClick={() => {
                onRemove();
                setShowDeleteConfirm(false);
              }}
            >
              削除
            </button>
            <button
              type="button"
              className="rounded px-1 py-0.5 text-[#6b7280] hover:bg-[#eceef1]"
              onClick={() => setShowDeleteConfirm(false)}
            >
              取消
            </button>
          </div>
        )}
      </div>

      {/* カレンダー一覧 */}
      {isOpen &&
        account.calendars.map((calendar) => {
          const checked = account.selectedCalendarIds.has(calendar.id);
          const Icon = checked ? CheckCircleFilledIcon : CircleOutlineIcon;

          return (
            <button
              key={calendar.id}
              type="button"
              className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 pl-7 text-left transition-colors hover:bg-[#eceef1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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

      {/* カレンダーが未取得のとき */}
      {isOpen && account.calendars.length === 0 && (
        <p className="px-7 py-1 text-[11px] text-[#b0b5bf]">
          {account.syncState === "syncing" ? "読み込み中…" : "カレンダーなし"}
        </p>
      )}

      {/* エラー表示 */}
      {account.error && (
        <p className="mt-1 px-2 text-[11px] leading-relaxed text-[#b42318]">
          {account.error}
        </p>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// CalendarSidebar
// ─────────────────────────────────────────────────────────────

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
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] transition-colors hover:bg-[#eceef1] hover:text-[#3d4049] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onPreviousMonth}
              aria-label="Previous month"
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              className="flex h-6 w-6 items-center justify-center rounded-md text-[#9aa0aa] transition-colors hover:bg-[#eceef1] hover:text-[#3d4049] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              onClick={onNextMonth}
              aria-label="Next month"
            >
              <IconChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

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
                  "flex aspect-square w-full items-center justify-center rounded-full",
                  "text-[11px] font-medium leading-none",
                  "transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  day.isToday &&
                    "bg-[#185FA5] text-white shadow-[0_2px_8px_rgba(24,95,165,0.35)]",
                  day.isSelected && !day.isToday && "bg-[#2d3039] text-white",
                  !isActive &&
                    day.isCurrentMonth &&
                    "text-[#2d3039] hover:bg-[#eceef1]",
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
      <nav className="flex w-full flex-col gap-0.5" aria-label="Calendar lists">
        {/* My Calendars */}
        <div className="mb-1 flex h-6 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-[#74798b]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#9aa0aa]">
            My Calendars
          </span>
        </div>

        {APP_CALENDAR_ITEMS.map((calendar) => {
          const Icon = calendar.checked
            ? CheckCircleFilledIcon
            : CircleOutlineIcon;

          return (
            <button
              key={calendar.id}
              type="button"
              className="group flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left transition-colors hover:bg-[#eceef1] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: calendar.color }}
              />
              <span className="truncate text-[12px] font-medium text-[#3d4049]">
                {calendar.label}
              </span>
            </button>
          );
        })}

        {/* Google アカウントセクション（複数） */}
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

        {/* アカウント追加ボタン */}
        <div
          className={cn(
            "mt-2",
            hasGoogleAccounts && "border-t border-[#e4e6eb] pt-2",
          )}
        >
          <button
            type="button"
            className="flex h-7 w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left transition-colors hover:bg-[#eceef1] disabled:cursor-wait disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            onClick={onAddCalendar}
            disabled={isAnyCalendarConnecting}
          >
            <PlusIcon className="h-4 w-4 shrink-0 text-[#74798b]" />
            <span className="truncate text-[12px] font-medium text-[#74798b]">
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
