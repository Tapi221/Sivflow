import { type FormEvent, type KeyboardEvent, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { GoogleAccountChip } from "@/chip/budge/GoogleAccountChip";
import { AddGoogleCalendarButton } from "@/chip/button/AddGoogleCalendarButton";
import { CalendarDayNumberCircle } from "@/chip/icon/CalendarDayNumberCircle";
import { CalendarIcon, TaskIcon } from "@/components/icons/icons.schedule";
import { HoverTooltip } from "@/components/toolchip/HoverTooltip";
import * as C from "@/features/calendar/calendar.constants.desktop";
import type { MiniCalendarDay } from "@/features/calendar/calendar.types";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import type { AppCalendarItem, CalendarSelectionRange, CalendarSidebarProps, GoogleAccountDisplay } from "../scheduleScreen.types";
import { SelectableGoogleSourceRow } from "./SelectableGoogleSourceRow";

const DEFAULT_CALENDAR_COLOR = "#74798b";
const DEFAULT_TASK_LIST_COLOR = "#7c8cf8";
const SIDEBAR_DIVIDER_CLASS = "h-px w-full shrink-0 bg-[#eeeeee]";
const MINI_CALENDAR_NAV_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded-full text-[#b7b7b7] transition-all hover:bg-[#f7f7f7] hover:text-[#8c8c8c] active:scale-[0.94] active:bg-[#f1f1f1]";
const GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME = "px-5";
const ADD_PROJECT_EMPTY_MESSAGE = "プロジェクト名を入力してください";

const normalizeCalendarLabel = (value?: string | null): string =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-_]+/g, "");

const getTaskCalendarCandidates = (taskListTitle: string): string[] => {
  const normalizedTitle = normalizeCalendarLabel(taskListTitle);
  const candidates = new Set([
    normalizedTitle,
    normalizeCalendarLabel(`${taskListTitle} Tasks`),
    normalizeCalendarLabel(`${taskListTitle} ToDo`),
    normalizeCalendarLabel(`${taskListTitle} Todo`),
    normalizeCalendarLabel(`${taskListTitle} タスク`),
    normalizeCalendarLabel(`${taskListTitle} ToDo リスト`),
    normalizeCalendarLabel(`${taskListTitle} ToDoリスト`),
  ]);

  if (normalizedTitle === "mytasks" || normalizedTitle === "マイタスク") {
    candidates.add("tasks");
    candidates.add("todo");
    candidates.add("todos");
    candidates.add("googleasks");
    candidates.add("googletasks");
    candidates.add("task");
    candidates.add("todoリスト");
    candidates.add("todolist");
  }

  return Array.from(candidates).filter(Boolean);
};

const resolveTaskListColor = (
  account: GoogleAccountDisplay,
  taskListTitle: string,
): string => {
  const taskCalendarCandidates = getTaskCalendarCandidates(taskListTitle);
  const matchingCalendar = account.calendars.find((calendar) => {
    const labels = [
      calendar.summary,
      calendar.summaryOverride,
      calendar.description,
      calendar.id,
    ].map(normalizeCalendarLabel);

    return labels.some((label) => taskCalendarCandidates.includes(label));
  });

  return matchingCalendar?.backgroundColor ?? DEFAULT_TASK_LIST_COLOR;
};

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

const IconPlus = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 3.5V12.5M3.5 8H12.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const normalizeSelectionRange = (range?: CalendarSelectionRange | null) => {
  if (!range) return null;

  const start = startOfDay(range.start);
  const end = startOfDay(range.end);

  return start.getTime() <= end.getTime()
    ? { start, end }
    : { start: end, end: start };
};

const buildMiniCalendarDays = (
  monthDate: Date,
  selectedDate: Date,
  selectedRange?: CalendarSelectionRange | null,
): MiniCalendarDay[] => {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const today = startOfDay(new Date());
  const range = normalizeSelectionRange(selectedRange);

  return Array.from({ length: C.MINI_CALENDAR_CELL_COUNT }, (_, index) => {
    const date = addDays(gridStart, index);
    const dayStart = startOfDay(date);
    const dayTime = dayStart.getTime();
    const isRangeStart = range ? isSameDay(dayStart, range.start) : false;
    const isRangeEnd = range ? isSameDay(dayStart, range.end) : false;
    const isInSelectedRange = range
      ? dayTime >= range.start.getTime() && dayTime <= range.end.getTime()
      : false;

    return {
      date,
      dayNumber: format(date, "d"),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: range ? isRangeStart || isRangeEnd : isSameDay(date, selectedDate),
      isToday: isSameDay(date, today),
      isRangeStart,
      isRangeEnd,
      isInSelectedRange,
    };
  });
};

type AppProjectsSectionProps = {
  projects: AppCalendarItem[];
  onAddProject: (projectName: string) => void;
  onToggleProject: (projectId: string) => void;
};

const AppProjectsSection = ({
  projects,
  onAddProject,
  onToggleProject,
}: AppProjectsSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddProject = () => {
    const trimmedProjectName = projectName.trim();

    if (!trimmedProjectName) {
      setAddError(ADD_PROJECT_EMPTY_MESSAGE);
      inputRef.current?.focus();
      return;
    }

    onAddProject(trimmedProjectName);
    setProjectName("");
    setAddError(null);
    setIsAdding(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddProject();
  };

  const handleProjectNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    handleAddProject();
  };

  const handleStartAdding = () => {
    setIsAdding(true);
    setAddError(null);
  };

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {projects.map((project) => (
        <SelectableGoogleSourceRow
          key={project.id}
          id={project.id}
          label={project.label}
          checked={project.checked}
          color={project.color}
          onToggle={onToggleProject}
        />
      ))}

      {isAdding ? (
        <div className="mx-2 ml-5 mt-1 flex flex-col gap-1">
          <form
            className="flex h-7 items-center gap-1.5"
            onSubmit={handleSubmit}
          >
            <input
              ref={inputRef}
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
              placeholder="プロジェクト名"
              aria-label="プロジェクト名"
              aria-invalid={Boolean(addError)}
              aria-describedby={addError ? "app-project-add-error" : undefined}
              className={cn(
                "min-w-0 flex-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#2f2f2f] outline-none transition focus:ring-2",
                addError
                  ? "border border-[#e08b8b] focus:border-[#e08b8b] focus:ring-[#f9e8e8]"
                  : "border border-[#e6e6e6] focus:border-[#d7d7d7] focus:ring-[#f2f2f2]",
              )}
            />
            <button
              type="submit"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#6d7380] transition hover:bg-[#ececec] active:scale-[0.94]"
              aria-label="プロジェクトを追加"
            >
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          </form>
          {addError && (
            <p id="app-project-add-error" className="px-3 text-[10px] font-semibold text-[#c25f5f]">
              {addError}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="mx-2 ml-5 mt-1 flex h-7 items-center gap-2 rounded-[10px] px-2 text-left text-[12px] font-medium text-[#8c8c8c] transition hover:bg-[#f7f7f7] hover:text-[#5f6574] active:bg-[#f1f1f1]"
          onClick={handleStartAdding}
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#f4f4f4] text-[#8c8c8c]">
            <IconPlus className="h-3.5 w-3.5" />
          </span>
          <span>プロジェクトを追加</span>
        </button>
      )}
    </div>
  );
};

type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  mode: "calendar" | "task";
  selectedTaskListIds?: Set<string>;
  onToggleCalendar: (calendarId: string) => void;
  onToggleTaskList?: (taskListId: string) => void;
  onReconnect: () => void;
};

const GoogleAccountSection = ({
  account,
  mode,
  selectedTaskListIds,
  onToggleCalendar,
  onToggleTaskList,
  onReconnect,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = account.name ?? account.email ?? "Google";
  const isTaskMode = mode === "task";
  const hasTaskListsError = Boolean(account.taskListsError);
  const hasNoTaskLists =
    !hasTaskListsError && !account.isTaskListsLoading && account.taskLists.length === 0;

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
          {account.calendars.map((calendar) => (
            <SelectableGoogleSourceRow
              key={calendar.id}
              id={calendar.id}
              label={calendar.summary}
              checked={account.selectedCalendarIds.has(calendar.id)}
              color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
              onToggle={onToggleCalendar}
            />
          ))}
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

          {hasTaskListsError && (
            <div
              className={cn(
                GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
                "py-1 text-[11px] text-[#c25f5f]",
              )}
            >
              <p>Google ToDo リストを取得できませんでした。</p>
              <p className="mt-0.5 text-[#9a9a9a]">{account.taskListsError}</p>
              <button
                type="button"
                className="mt-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] font-semibold text-[#5f6574] transition hover:bg-[#ececec] active:scale-[0.97]"
                onClick={onReconnect}
              >
                再連携
              </button>
            </div>
          )}

          {hasNoTaskLists && (
            <div
              className={cn(
                GOOGLE_ACCOUNT_CHILD_TEXT_PADDING_CLASS_NAME,
                "py-1 text-[11px] text-[#9a9a9a]",
              )}
            >
              <p>Google ToDo リストはありません。</p>
              <button
                type="button"
                className="mt-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] font-semibold text-[#5f6574] transition hover:bg-[#ececec] active:scale-[0.97]"
                onClick={onReconnect}
              >
                再連携
              </button>
            </div>
          )}

          {!hasTaskListsError && account.taskLists.map((taskList) => (
            <SelectableGoogleSourceRow
              key={taskList.id}
              id={taskList.id}
              label={taskList.title}
              checked={selectedTaskListIds?.has(taskList.id) ?? false}
              color={resolveTaskListColor(account, taskList.title)}
              onToggle={(taskListId) => onToggleTaskList?.(taskListId)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CalendarSidebar = ({
  monthDate,
  selectedDate,
  selectedRange,
  activeMode,
  appProjects,
  googleAccounts,
  isAnyCalendarConnecting,
  selectedTaskListIds,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onAddCalendar,
  onAddProject,
  onToggleProject,
  onReconnectAccount,
  onToggleCalendar,
  onToggleTaskList,
}: CalendarSidebarProps) => {
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const miniCalendarDays = useMemo(
    () => buildMiniCalendarDays(monthDate, selectedDate, selectedRange),
    [monthDate, selectedDate, selectedRange],
  );

  const hasGoogleAccounts = googleAccounts.length > 0;
  const hasAppProjects = appProjects.length > 0;
  const isTaskMode = activeMode === "task";

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent pb-5 pl-0 pr-3 pt-2 text-[#2f2f2f]">
      <section className="flex w-full shrink-0 flex-col pb-2.5 pl-0 pr-2.5 pt-2.5">
        <div className="flex w-full items-center justify-between px-0.5">
          <span className="ml-3 text-[13px] font-extrabold tracking-[-0.01em] text-[#3f4652]">
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
              className="flex h-6 items-center justify-center text-[11px] font-extrabold uppercase text-[#8c8c8c]"
            >
              {weekday}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5 px-0.5">
          {miniCalendarDays.map((day) => {
            const isActive = day.isToday || day.isSelected;
            const isRangeMiddle =
              day.isInSelectedRange && !day.isRangeStart && !day.isRangeEnd;

            return (
              <button
                key={day.date.toISOString()}
                type="button"
                onClick={() => onSelectDate(day.date)}
                className={cn(
                  "relative flex h-7 w-full items-center justify-center transition-all duration-150 active:scale-[0.92]",
                  !day.isInSelectedRange && !isActive && "rounded-full hover:bg-[#f7f7f7]",
                )}
              >
                {day.isInSelectedRange ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-x-0 top-1/2 h-[21px] -translate-y-1/2 bg-[#e8eaee] shadow-[0_1px_3px_rgba(15,23,42,0.05)_inset]",
                      day.isRangeStart && "rounded-l-full",
                      day.isRangeEnd && "rounded-r-full",
                      day.isRangeStart && day.isRangeEnd && "rounded-full",
                    )}
                  />
                ) : null}

                <CalendarDayNumberCircle
                  isToday={day.isToday && !day.isInSelectedRange}
                  isSelected={day.isSelected}
                  isCurrentMonth={day.isCurrentMonth}
                  className={cn(
                    "relative z-10 font-semibold",
                    day.isCurrentMonth && !isActive && !day.isInSelectedRange && "text-[#5f6673]",
                    isRangeMiddle && "bg-transparent text-[#5f6673] shadow-none",
                    day.isToday && day.isInSelectedRange && "ring-1 ring-[#b8bdc7]",
                    !day.isCurrentMonth && !isActive && !day.isInSelectedRange && "text-[#b7b7b7]",
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

        {!isTaskMode && (
          <AppProjectsSection
            projects={appProjects}
            onAddProject={onAddProject}
            onToggleProject={onToggleProject}
          />
        )}

        {googleAccounts.map((account) => (
          <GoogleAccountSection
            key={account.accountId}
            account={account}
            mode={isTaskMode ? "task" : "calendar"}
            selectedTaskListIds={selectedTaskListIds}
            onToggleCalendar={(calendarId) =>
              onToggleCalendar(account.accountId, calendarId)
            }
            onToggleTaskList={onToggleTaskList}
            onReconnect={() => onReconnectAccount(account.accountId)}
          />
        ))}
      </nav>

      <div className="mt-auto w-full shrink-0">
        {(hasGoogleAccounts || hasAppProjects) && (
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
