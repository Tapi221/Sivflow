import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { addDays, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isToday, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { ToggleCalendarTimelineTask } from "@/chip/toggle/Toggle.calendartimelinetask";
import type { GoogleCalendarEvent } from "@/features/calendar/googlecalendar-integration/gcalSync.types";
import type { CalendarViewMode, ScheduleScreenProps } from "@/features/calendar/scheduleScreen.types";
import { TaskView } from "@/features/calendar/task/TaskView";
import { useTaskCalendarEvents } from "@/features/calendar/task/hooks/useTaskCalendarEvents";
import { useScheduleScreen } from "@/features/calendar/useScheduleScreen";
import { useDateFnsLocale, useMonthLabelFormat, useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const WEEK_STARTS_ON_MONDAY = 1;
const MAX_AGENDA_EVENTS = 12;

type MobileViewOption = {
  value: CalendarViewMode;
  label: string;
};

const getMonthGridDays = (monthDate: Date): Date[] => {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON_MONDAY });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON_MONDAY });
  const days: Date[] = [];

  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    days.push(cursor);
  }

  return days;
};

const eventOverlapsDay = (event: GoogleCalendarEvent, day: Date): boolean => {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);

  return event.startsAt <= dayEnd && event.endsAt >= dayStart;
};

const getEventsForDay = (events: GoogleCalendarEvent[], day: Date): GoogleCalendarEvent[] => {
  return events
    .filter((event) => eventOverlapsDay(event, day))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
};

const getEventTimeLabel = (event: GoogleCalendarEvent, allDayLabel: string): string => {
  if (event.isAllDay) return allDayLabel;

  if (isSameDay(event.startsAt, event.endsAt)) {
    return `${format(event.startsAt, "HH:mm")} - ${format(event.endsAt, "HH:mm")}`;
  }

  return `${format(event.startsAt, "M/d HH:mm")} - ${format(event.endsAt, "M/d HH:mm")}`;
};

export const ScheduleScreen = ({ initialActiveMode, onClose }: ScheduleScreenProps) => {
  const pane = useScheduleScreen({ initialActiveMode });
  const taskCalendarEvents = useTaskCalendarEvents();
  const t = useT();
  const dateFnsLocale = useDateFnsLocale();
  const monthLabelFormat = useMonthLabelFormat();
  const selectedTaskListInitializedRef = useRef(false);
  const [selectedTaskListIds, setSelectedTaskListIds] = useState<Set<string>>(() => new Set());
  const deferredSelectedTaskListIds = useDeferredValue(selectedTaskListIds);

  const {
    activeMode,
    selectedViewMode,
    selectedDate,
    titleDate,
    monthTitleDate,
    googleCalendarEvents,
    googleAccounts,
    isAnyCalendarConnecting,
    setActiveMode,
    handleSelectViewMode,
    handleSidebarSelectDate,
    handleTimelineSelectDate,
    handlePrevious,
    handleNext,
    handleToday,
    handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    addGoogleCalendar,
    refreshGoogleTasks,
    createGoogleTask,
    updateGoogleTask,
    moveGoogleTaskList,
    deleteGoogleTask,
  } = pane;

  const modeTabs = useMemo(() => [
    { value: "calendar" as const, label: t.calendarTab, onClick: () => setActiveMode("calendar") },
    { value: "timeline" as const, label: t.timelineTab, onClick: () => setActiveMode("timeline") },
    { value: "task" as const, label: t.taskTab, onClick: () => setActiveMode("task") },
  ], [setActiveMode, t.calendarTab, t.taskTab, t.timelineTab]);

  const viewOptions = useMemo<MobileViewOption[]>(() => [
    { value: "month", label: t.viewMonth },
    { value: "week", label: t.viewWeek },
    { value: "days", label: t.viewDay },
  ], [t.viewDay, t.viewMonth, t.viewWeek]);

  const calendarEvents = useMemo(() => {
    return [...googleCalendarEvents, ...taskCalendarEvents];
  }, [googleCalendarEvents, taskCalendarEvents]);

  const allTaskListIds = useMemo(() => {
    return googleAccounts.flatMap((account) => account.taskLists.map((taskList) => taskList.id));
  }, [googleAccounts]);
  const allTaskListIdsKey = allTaskListIds.join("\t");

  useEffect(() => {
    setSelectedTaskListIds((ids) => {
      if (allTaskListIds.length === 0) {
        selectedTaskListInitializedRef.current = false;
        return ids.size === 0 ? ids : new Set();
      }

      if (!selectedTaskListInitializedRef.current) {
        selectedTaskListInitializedRef.current = true;
        return new Set(allTaskListIds);
      }

      const availableTaskListIds = new Set(allTaskListIds);
      const nextIds = new Set<string>();

      for (const id of ids) {
        if (availableTaskListIds.has(id)) {
          nextIds.add(id);
        }
      }

      return nextIds.size === ids.size ? ids : nextIds;
    });
    // allTaskListIdsKey でリストの実質的な変化だけを検知する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTaskListIdsKey]);

  const monthGridDays = useMemo(() => getMonthGridDays(monthTitleDate), [monthTitleDate]);

  useEffect(() => {
    const firstDay = monthGridDays[0];
    const lastDay = monthGridDays[monthGridDays.length - 1];

    if (!firstDay || !lastDay) return;

    handleMonthRenderedRangeChange({
      start: startOfDay(firstDay),
      end: endOfDay(lastDay),
    });
  }, [handleMonthRenderedRangeChange, monthGridDays]);

  const visibleWeekDays = useMemo(() => {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON_MONDAY });
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate]);

  const selectedDateEvents = useMemo(() => {
    return getEventsForDay(calendarEvents, selectedDate).slice(0, MAX_AGENDA_EVENTS);
  }, [calendarEvents, selectedDate]);

  const upcomingEvents = useMemo(() => {
    const rangeStart = startOfDay(selectedDate);
    const rangeEnd = endOfDay(addDays(selectedDate, selectedViewMode === "days" ? 0 : 6));

    return calendarEvents
      .filter((event) => event.startsAt <= rangeEnd && event.endsAt >= rangeStart)
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .slice(0, MAX_AGENDA_EVENTS);
  }, [calendarEvents, selectedDate, selectedViewMode]);

  const weekdayLabels = useMemo(() => {
    return [
      t.miniCalendarWeekdays[1],
      t.miniCalendarWeekdays[2],
      t.miniCalendarWeekdays[3],
      t.miniCalendarWeekdays[4],
      t.miniCalendarWeekdays[5],
      t.miniCalendarWeekdays[6],
      t.miniCalendarWeekdays[0],
    ];
  }, [t.miniCalendarWeekdays]);

  const headerTitleDate = selectedViewMode === "month" ? monthTitleDate : titleDate;
  const primaryEvents = activeMode === "timeline" ? upcomingEvents : selectedDateEvents;

  const handleSelectDate = (date: Date) => {
    if (activeMode === "timeline") {
      handleTimelineSelectDate(date);
      return;
    }

    if (selectedViewMode === "month") {
      handleMonthCellSelectDate(date);
      return;
    }

    handleSidebarSelectDate(date);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white text-[#1c1c1e]">
      <header className="shrink-0 border-b border-[#eeeeee] bg-white px-4 pb-3 pt-[calc(env(safe-area-inset-top)+14px)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8c8c8c]">Schedule</p>
            <h1 className="mt-1 truncate text-[24px] font-semibold tracking-[-0.04em] text-[#1c1c1e]">
              {format(headerTitleDate, monthLabelFormat, { locale: dateFnsLocale })}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <ToggleCalendarTimelineTask activeMode={activeMode} tabs={modeTabs} />
            <button type="button" className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#e5e5ea] bg-white px-3 text-[13px] font-semibold text-[#1f6feb] shadow-[0_1px_2px_rgba(15,23,42,0.08)]" onClick={handleToday}>
              {t.todayButton}
            </button>
            {onClose ? (
              <button type="button" className="flex h-9 min-w-9 items-center justify-center rounded-full border border-[#e5e5ea] bg-white px-3 text-[13px] font-semibold text-[#6e6e73] shadow-[0_1px_2px_rgba(15,23,42,0.08)]" onClick={onClose}>
                Close
              </button>
            ) : (
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9e7ff] bg-[#f3f7ff] text-[20px] font-semibold leading-none text-[#1f6feb] shadow-[0_1px_2px_rgba(15,23,42,0.08)]" onClick={() => { void addGoogleCalendar(); }} aria-label={t.addGoogleCalendar}>
                +
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-1 rounded-full bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-[#eeeeee]">
            {viewOptions.map((option) => (
              <button key={option.value} type="button" className={cn("h-8 rounded-full px-3 text-[12px] font-semibold transition", selectedViewMode === option.value ? "bg-[#1f6feb] text-white" : "text-[#6e6e73]")} onClick={() => handleSelectViewMode(option.value)} aria-pressed={selectedViewMode === option.value}>
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[18px] font-semibold text-[#6e6e73] shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-[#eeeeee]" onClick={handlePrevious} aria-label={t.previousLabel}>
              ‹
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[18px] font-semibold text-[#6e6e73] shadow-[0_1px_3px_rgba(15,23,42,0.12)] ring-1 ring-[#eeeeee]" onClick={handleNext} aria-label={t.nextLabel}>
              ›
            </button>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4">
        {activeMode === "task" ? (
          <section className="min-h-[calc(100dvh-220px)] overflow-hidden rounded-[26px] border border-[#eeeeee] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
            <TaskView googleAccounts={googleAccounts} selectedTaskListIds={deferredSelectedTaskListIds} onRefreshGoogleTasks={refreshGoogleTasks} onCreateGoogleTask={createGoogleTask} onUpdateGoogleTask={updateGoogleTask} onMoveGoogleTaskList={moveGoogleTaskList} onDeleteGoogleTask={deleteGoogleTask} />
          </section>
        ) : (
          <div className="flex flex-col gap-4">
            <section className="rounded-[26px] border border-[#eeeeee] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-semibold text-[#8c8c8c]">{format(selectedDate, "M/d EEE", { locale: dateFnsLocale })}</p>
                  <h2 className="mt-1 text-[19px] font-semibold tracking-[-0.03em] text-[#1c1c1e]">
                    {activeMode === "timeline" ? t.timelineTab : t.calendarTab}
                  </h2>
                </div>
                <div className="rounded-full bg-[#f3f7ff] px-3 py-1 text-[12px] font-semibold text-[#1f6feb]">
                  {googleAccounts.length > 0 ? `${googleAccounts.length} Google` : isAnyCalendarConnecting ? t.connecting : t.addGoogleCalendar}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1">
                {visibleWeekDays.map((day) => {
                  const eventsForDay = getEventsForDay(calendarEvents, day);
                  const isSelected = isSameDay(day, selectedDate);

                  return (
                    <button key={day.toISOString()} type="button" className={cn("flex min-h-[62px] flex-col items-center justify-center rounded-[18px] px-1 transition", isSelected ? "bg-[#1f6feb] text-white shadow-lg shadow-[#1f6feb]/25" : "bg-[#f7f7f7] text-[#3a3a3c]")} onClick={() => handleSelectDate(day)} aria-pressed={isSelected}>
                      <span className={cn("text-[10px] font-semibold", isSelected ? "text-white/75" : "text-[#8c8c8c]")}>{format(day, "EEE", { locale: dateFnsLocale })}</span>
                      <span className="mt-1 text-[17px] font-semibold">{format(day, "d")}</span>
                      <span className="mt-2 flex h-1.5 items-center gap-0.5">
                        {eventsForDay.slice(0, 3).map((event) => (
                          <span key={`${event.id}:${day.toISOString()}`} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: isSelected ? "rgba(255,255,255,0.86)" : event.accentColor }} />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {activeMode === "calendar" && selectedViewMode === "month" ? (
              <section className="rounded-[26px] border border-[#eeeeee] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[#8c8c8c]">
                  {weekdayLabels.map((label) => (
                    <span key={label}>{label}</span>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-7 gap-1">
                  {monthGridDays.map((day) => {
                    const eventsForDay = getEventsForDay(calendarEvents, day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isInMonth = isSameMonth(day, monthTitleDate);
                    const isCurrentDate = isToday(day);

                    return (
                      <button key={day.toISOString()} type="button" className={cn("min-h-[48px] rounded-[15px] border text-left transition", isSelected ? "border-[#1f6feb] bg-[#f3f7ff]" : "border-transparent bg-transparent", !isInMonth ? "opacity-35" : "opacity-100")} onClick={() => handleSelectDate(day)} aria-pressed={isSelected}>
                        <span className={cn("ml-2 mt-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold", isCurrentDate ? "bg-[#1f6feb] text-white" : "text-[#3a3a3c]")}>{format(day, "d")}</span>
                        <span className="mt-1 flex px-2">
                          {eventsForDay.slice(0, 3).map((event) => (
                            <span key={`${event.id}:${day.toISOString()}`} className="mr-0.5 h-1.5 flex-1 rounded-full" style={{ backgroundColor: event.accentColor }} />
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="rounded-[26px] border border-[#eeeeee] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-[18px] font-semibold tracking-[-0.03em] text-[#1c1c1e]">
                  {activeMode === "timeline" ? "Upcoming" : format(selectedDate, "M/d の予定", { locale: dateFnsLocale })}
                </h2>
                <span className="rounded-full bg-[#f7f7f7] px-2.5 py-1 text-[12px] font-semibold text-[#8c8c8c]">{primaryEvents.length}</span>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                {primaryEvents.length > 0 ? (
                  primaryEvents.map((event) => (
                    <article key={event.id} className="flex gap-3 rounded-[20px] border border-[#eeeeee] bg-white p-3">
                      <span className="mt-1 h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: event.accentColor }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[#1c1c1e]">{event.title}</p>
                        <p className="mt-1 text-[12px] font-medium text-[#8c8c8c]">{getEventTimeLabel(event, t.allDay)}</p>
                        {event.location ? <p className="mt-1 truncate text-[12px] text-[#8c8c8c]">{event.location}</p> : null}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-[#e5e5ea] bg-white px-4 py-8 text-center">
                    <p className="text-[14px] font-semibold text-[#6e6e73]">予定はありません</p>
                    <p className="mt-1 text-[12px] text-[#8c8c8c]">Google Calendar やタスクを追加するとここに表示されます。</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};