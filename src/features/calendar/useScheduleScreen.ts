import type { RefObject, UIEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { useCalendarLayout } from "@/features/calendar/layout/calendar/useCalendarLayout.desktop";
import { useCalendarScrollController } from "@/features/scroll/schedule/hooks/useCalendarScrollController";
import { useCalendarEventSync } from "@/sync/googlecalendar-sync/useCalendarEventSync";
import type { CalendarDateRange } from "@/features/calendar/calendarRange.types";
import type { CalendarGridStyle, CalendarToolbarMode, CalendarViewMode, GoogleAccountDisplay } from "./scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useCalendarNavigation } from "./useCalendarNavigation";
import { useCalendarVisibleRange } from "./useCalendarVisibleRange";
import { useGoogleCalendarLayer } from "./useGoogleCalendarLayer";

export type UseScheduleScreenReturn = {
  contentViewportRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef: RefObject<HTMLDivElement | null>;
  handleCalendarScroll?: (event: UIEvent<HTMLDivElement>) => void;

  currentDate: Date;
  selectedDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;

  selectedViewMode: CalendarViewMode;
  activeMode: CalendarToolbarMode;
  setActiveMode: (mode: CalendarToolbarMode) => void;

  visibleDays: Date[];
  displayDays: Date[];

  titleDate: Date;
  monthLabel: string | null;

  calendarDayColumnWidth: number;
  calendarGridStyle: CalendarGridStyle;

  googleAccounts: GoogleAccountDisplay[];
  googleCalendarEvents: GoogleCalendarEvent[];
  isAnyCalendarConnecting: boolean;

  addGoogleCalendar: () => Promise<void>;
  reconnectGoogleAccount: (accountId: string) => Promise<void>;
  toggleGoogleCalendar: (accountId: string, calendarId: string) => void;

  refreshGoogleTasks: () => Promise<void>;
  retryGoogleTaskLists: () => void;
  createGoogleTask: (taskListId: string, input: {
    title: string;
    notes?: string | null;
    due?: string | null;
    status?: "needsAction" | "completed";
  }) => Promise<unknown>;
  updateGoogleTask: (taskListId: string, taskId: string, patch: {
    title?: string;
    notes?: string | null;
    due?: string | null;
    status?: "needsAction" | "completed";
    completed?: string | null;
  }) => Promise<unknown>;
  moveGoogleTaskList: (taskListId: string, taskId: string, destinationTaskListId: string) => Promise<unknown>;
  deleteGoogleTask: (taskListId: string, taskId: string) => Promise<void>;

  handleSelectViewMode: (viewMode: CalendarViewMode) => void;
  handleToday: () => void;
  handlePrevious: () => void;
  handleNext: () => void;

  handleSidebarPreviousMonth: () => void;
  handleSidebarNextMonth: () => void;
  handleSidebarSelectDate: (date: Date) => void;
  handleVisibleMonthChange: (date: Date) => void;
  handleMonthCellSelectDate: (date: Date) => void;
  handleMonthRenderedRangeChange: (range: CalendarDateRange) => void;
  handleYearRenderedRangeChange: (range: CalendarDateRange) => void;

  setMonthTitleDate: (date: Date) => void;
};

type UseScheduleScreenOptions = {
  initialActiveMode?: CalendarToolbarMode;
};

const getGoogleCalendarEventDedupeKey = (event: GoogleCalendarEvent): string => event.id;

const dedupeGoogleCalendarEvents = (
  events: GoogleCalendarEvent[],
): GoogleCalendarEvent[] => {
  const seenKeys = new Set<string>();

  return events.filter((event) => {
    const key = getGoogleCalendarEventDedupeKey(event);

    if (seenKeys.has(key)) return false;

    seenKeys.add(key);
    return true;
  });
};

export const useScheduleScreen = ({
  initialActiveMode,
}: UseScheduleScreenOptions = {}): UseScheduleScreenReturn => {
  const navigation = useCalendarNavigation({ initialActiveMode });
  const [monthRenderedRange, setMonthRenderedRange] =
    useState<CalendarDateRange | null>(null);
  const [yearRenderedRange, setYearRenderedRange] =
    useState<CalendarDateRange | null>(null);

  const handleMonthRenderedRangeChange = useCallback(
    (range: CalendarDateRange) => {
      setMonthRenderedRange((prev) => {
        if (
          prev?.start.getTime() === range.start.getTime() &&
          prev.end.getTime() === range.end.getTime()
        ) {
          return prev;
        }

        return range;
      });
    },
    [],
  );

  const handleYearRenderedRangeChange = useCallback(
    (range: CalendarDateRange) => {
      setYearRenderedRange((prev) => {
        if (
          prev?.start.getTime() === range.start.getTime() &&
          prev.end.getTime() === range.end.getTime()
        ) {
          return prev;
        }

        return range;
      });
    },
    [],
  );

  const visibleRange = useCalendarVisibleRange({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    calendarBuffer: navigation.calendarBuffer,
  });

  const visibleDays = visibleRange.interactionDays;
  const displayDays = visibleRange.displayDays;

  const layout = useCalendarLayout({
    viewportWidth: navigation.viewportWidth,
    visibleDays,
    displayDays,
    selectedViewMode: navigation.selectedViewMode,
    currentDate: navigation.currentDate,
    calendarBuffer: navigation.calendarBuffer,
  });

  const scroll = useCalendarScrollController({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onExtendLeft: navigation.extendCalendarBufferLeft,
    onExtendRight: navigation.extendCalendarBufferRight,
    scrollTargetToken: navigation.calendarScrollToken,
  });

  const google = useGoogleCalendarLayer();
  const googleCalendarEvents = useMemo(
    () => dedupeGoogleCalendarEvents(google.events),
    [google.events],
  );

  useCalendarEventSync({
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    monthRenderedRange,
    yearRenderedRange,
    googleCalendar: {
      selectedCalendarIds: google.selectedCalendarIds,
      forceSyncRange: google.forceSyncRange,
    },
  });

  const googleAccounts: GoogleAccountDisplay[] = google.googleAccounts.map(
    (account) => {
      const taskListState = google.taskListsByAccount[account.id];
      const googleTasksState = google.googleTasksByAccount[account.id];

      return {
        accountId: account.id,
        email: account.email,
        name: account.name,
        photoUrl: account.photoUrl,
        calendars: account.calendars,
        taskLists: taskListState?.taskLists ?? [],
        taskListsError: taskListState?.error ?? null,
        isTaskListsLoading: taskListState?.isLoading ?? false,
        googleTasks: googleTasksState?.tasks ?? [],
        googleTasksError: googleTasksState?.error ?? null,
        isGoogleTasksLoading: googleTasksState?.isLoading ?? false,
        selectedCalendarIds: account.selectedCalendarIds,
        connectionStatus: account.connectionStatus,
        error: account.error,
      };
    },
  );

  return {
    contentViewportRef: navigation.contentViewportRef,
    scrollContainerRef: scroll.scrollContainerRef,
    headerScrollRef: scroll.headerScrollRef,
    allDayScrollRef: scroll.allDayScrollRef,
    handleCalendarScroll: scroll.handleScroll,

    currentDate: navigation.currentDate,
    selectedDate: navigation.selectedDate,
    monthTitleDate: navigation.monthTitleDate,
    monthScrollTargetToken: navigation.monthScrollTargetToken,

    selectedViewMode: navigation.selectedViewMode,
    activeMode: navigation.activeMode,
    setActiveMode: navigation.setActiveMode,

    visibleDays,
    displayDays,

    titleDate: layout.titleDate,
    monthLabel: layout.monthLabel,

    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    calendarGridStyle: layout.calendarGridStyle,

    googleAccounts,
    googleCalendarEvents,
    isAnyCalendarConnecting: google.isAnyConnecting,

    addGoogleCalendar: google.addAccount,
    reconnectGoogleAccount: google.reconnectAccount,
    toggleGoogleCalendar: google.toggleCalendar,
    refreshGoogleTasks: google.refreshGoogleTasks,
    retryGoogleTaskLists: google.retryGoogleTaskLists,
    createGoogleTask: google.createGoogleTask,
    updateGoogleTask: google.updateGoogleTask,
    moveGoogleTaskList: google.moveGoogleTaskList,
    deleteGoogleTask: google.deleteGoogleTask,

    handleSelectViewMode: navigation.handleSelectViewMode,
    handleToday: navigation.handleToday,
    handlePrevious: navigation.handlePrevious,
    handleNext: navigation.handleNext,

    handleSidebarPreviousMonth: navigation.handleSidebarPreviousMonth,
    handleSidebarNextMonth: navigation.handleSidebarNextMonth,
    handleSidebarSelectDate: navigation.handleSidebarSelectDate,
    handleVisibleMonthChange: navigation.handleVisibleMonthChange,
    handleMonthCellSelectDate: navigation.handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    handleYearRenderedRangeChange,

    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};