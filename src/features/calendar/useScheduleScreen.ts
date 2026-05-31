import type { RefObject, UIEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import type { ScheduleVirtualRail } from "@/features/calendar/grid/ScheduleColumn.shared";
import { useCalendarLayout } from "@/features/calendar/layout/useCalendarLayout.desktop";
import { useCalendarScrollController } from "@/features/scroll/schedule/hooks/useCalendarScrollController";
import type { GCalWritableEventDeleteInput, GCalWritableEventInput, GCalWritableEventUpdateInput, GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useCalendarEventSync } from "@/sync/googlecalendar-sync/useCalendarEventSync";
import type { CalendarDateRange } from "./calendarRange.types";
import type { CalendarGridStyle, CalendarViewMode, CalendarViewModeSelection, GoogleAccountDisplay } from "./scheduleScreen.types";
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
  virtualRail: ScheduleVirtualRail;
  yearRenderedRange: CalendarDateRange | null;

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
  createGoogleCalendarEvent: (accountId: string, event: GCalWritableEventInput) => Promise<GoogleCalendarEvent>;
  updateGoogleCalendarEvent: (accountId: string, event: GCalWritableEventUpdateInput) => Promise<GoogleCalendarEvent>;
  deleteGoogleCalendarEvent: (accountId: string, event: GCalWritableEventDeleteInput) => Promise<void>;

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
  handleYearSyncRangeChange: (range: CalendarDateRange) => void;

  setMonthTitleDate: (date: Date) => void;
};

const getGoogleCalendarEventDedupeKey = (event: GoogleCalendarEvent): string => event.id;

const isSameCalendarDateRange = (left: CalendarDateRange | null, right: CalendarDateRange): boolean => left?.start.getTime() === right.start.getTime() && left.end.getTime() === right.end.getTime();

const dedupeGoogleCalendarEvents = (events: GoogleCalendarEvent[]): GoogleCalendarEvent[] => {
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
  const [monthRenderedRange, setMonthRenderedRange] = useState<CalendarDateRange | null>(null);
  const [yearRenderedRange, setYearRenderedRange] = useState<CalendarDateRange | null>(null);
  const [yearSyncRange, setYearSyncRange] = useState<CalendarDateRange | null>(null);

  const handleMonthRenderedRangeChange = useCallback((range: CalendarDateRange) => {
    setMonthRenderedRange((prev) => isSameCalendarDateRange(prev, range) ? prev : range);
  }, []);

  const handleYearRenderedRangeChange = useCallback((range: CalendarDateRange) => {
    setYearRenderedRange((prev) => isSameCalendarDateRange(prev, range) ? prev : range);
  }, []);

  const handleYearSyncRangeChange = useCallback((range: CalendarDateRange) => {
    setYearSyncRange((prev) => isSameCalendarDateRange(prev, range) ? prev : range);
  }, []);

  const visibleRange = useCalendarVisibleRange({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.primaryViewMode,
    calendarBuffer: navigation.calendarBuffer,
  });
  const visibleDays = visibleRange.interactionDays;
  const displayDays = visibleRange.displayDays;
  const virtualRail = visibleRange.virtualRail;
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
    virtualRail,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onVisibleDateChange: navigation.handleVisibleDateChange,
    scrollTargetToken: navigation.calendarScrollToken,
  });
  const google = useGoogleCalendarLayer();
  const googleCalendarEvents = useMemo(() => dedupeGoogleCalendarEvents(google.events), [google.events]);

  useCalendarEventSync({
    selectedViewMode: navigation.primaryViewMode,
    visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    monthRenderedRange,
    yearRenderedRange,
    yearSyncRange,
    googleCalendar: {
      selectedCalendarIds: google.selectedCalendarIds,
      forceSyncRange: google.forceSyncRange,
    },
  });

  const googleAccounts: GoogleAccountDisplay[] = google.googleAccounts.map((account) => {
    const taskListState = google.taskListsByAccount[account.id];
    const googleTasksState = google.googleTasksByAccount[account.id];

    return {
      accountId: account.id,
      email: account.email,
      name: account.name,
      photoUrl: account.photoUrl,
      accessToken: account.accessToken,
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
  });

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
    virtualRail,
    yearRenderedRange,
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
    createGoogleCalendarEvent: google.createCalendarEvent,
    updateGoogleCalendarEvent: google.updateCalendarEvent,
    deleteGoogleCalendarEvent: google.deleteCalendarEvent,
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
    handleYearSyncRangeChange,
    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};
