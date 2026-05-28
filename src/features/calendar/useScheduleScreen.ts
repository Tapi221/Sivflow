import type { RefObject, UIEvent } from "react";
import { startTransition, useCallback, useMemo, useState } from "react";
import { useCalendarLayout } from "@/features/calendar/layout/useCalendarLayout.desktop";
import { useCalendarScrollController } from "@/features/scroll/schedule/hooks/useCalendarScrollController";
import { useCalendarEventSync } from "@/sync/googlecalendar-sync/useCalendarEventSync";
import type { CalendarDateRange } from "./calendarRange.types";
import type { CalendarGridStyle, CalendarViewMode, CalendarViewModeSelection, GoogleAccountDisplay } from "./scheduleScreen.types";
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

  selectedViewMode: CalendarViewModeSelection;
  primaryViewMode: CalendarViewMode;

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

  handleSelectViewMode: (viewMode: CalendarViewMode) => void;
  handleToday: () => void;
  handlePrevious: () => void;
  handleNext: () => void;

  handleSidebarPreviousMonth: () => void;
  handleSidebarNextMonth: () => void;
  handleSidebarSelectDate: (date: Date) => void;
  handleVisibleDateChange: (date: Date) => void;
  handleVisibleMonthChange: (date: Date) => void;
  handleMonthCellSelectDate: (date: Date) => void;
  handleMonthRenderedRangeChange: (range: CalendarDateRange) => void;
  handleYearRenderedRangeChange: (range: CalendarDateRange) => void;
  handleListReachStart: () => void;
  handleListReachEnd: () => void;

  setMonthTitleDate: (date: Date) => void;
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

export const useScheduleScreen = (): UseScheduleScreenReturn => {
  const navigation = useCalendarNavigation();
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

  const handleListReachStart = useCallback(() => {
    startTransition(() => {
      navigation.extendCalendarBufferLeft();
    });
  }, [navigation]);

  const handleListReachEnd = useCallback(() => {
    startTransition(() => {
      navigation.extendCalendarBufferRight();
    });
  }, [navigation]);

  const visibleRange = useCalendarVisibleRange({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.primaryViewMode,
    calendarBuffer: navigation.calendarBuffer,
  });

  const visibleDays = visibleRange.interactionDays;
  const displayDays = visibleRange.displayDays;

  const layout = useCalendarLayout({
    viewportWidth: navigation.viewportWidth,
    visibleDays,
    displayDays,
    selectedViewMode: navigation.primaryViewMode,
    currentDate: navigation.currentDate,
    calendarBuffer: navigation.calendarBuffer,
  });

  const scroll = useCalendarScrollController({
    selectedViewMode: navigation.primaryViewMode,
    visibleDays,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onExtendLeft: navigation.extendCalendarBufferLeft,
    onExtendRight: navigation.extendCalendarBufferRight,
    onVisibleDateChange: navigation.handleVisibleDateChange,
    scrollTargetToken: navigation.calendarScrollToken,
  });

  const google = useGoogleCalendarLayer();
  const googleCalendarEvents = useMemo(
    () => dedupeGoogleCalendarEvents(google.events),
    [google.events],
  );

  useCalendarEventSync({
    selectedViewMode: navigation.primaryViewMode,
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
    primaryViewMode: navigation.primaryViewMode,

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

    handleSelectViewMode: navigation.handleSelectViewMode,
    handleToday: navigation.handleToday,
    handlePrevious: navigation.handlePrevious,
    handleNext: navigation.handleNext,

    handleSidebarPreviousMonth: navigation.handleSidebarPreviousMonth,
    handleSidebarNextMonth: navigation.handleSidebarNextMonth,
    handleSidebarSelectDate: navigation.handleSidebarSelectDate,
    handleVisibleDateChange: navigation.handleVisibleDateChange,
    handleVisibleMonthChange: navigation.handleVisibleMonthChange,
    handleMonthCellSelectDate: navigation.handleMonthCellSelectDate,
    handleMonthRenderedRangeChange,
    handleYearRenderedRangeChange,
    handleListReachStart,
    handleListReachEnd,

    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};