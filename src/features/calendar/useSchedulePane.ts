import type { RefObject, UIEvent } from "react";

import { useCalendarEventSync } from "@/features/calendar/googlecalendar-sync/useCalendarEventSync";
import type {
  CalendarToolbarMode,
  CalendarViewMode,
  GoogleAccountDisplay,
  TimelineGridStyle,
} from "./schedulePane.types";
import type { GoogleCalendarEvent } from "./googlecalendar-integration/gcalSync.types";
import type {
  buildTimelineColumns,
  TimelineUnitBuffer,
} from "./grid/TimelineDayView.shared";

import { useCalendarLayout } from "./layout/calendar/useCalendarLayout.desktop";
import { useCalendarNavigation } from "./useCalendarNavigation";
import { useCalendarScrollController } from "./scroll/hooks/useCalendarScrollController";
import { useCalendarVisibleRange } from "./useCalendarVisibleRange";
import { useGoogleCalendarLayer } from "./useGoogleCalendarLayer";
import { useTimelineGrid } from "./grid/useTimelineGrid";

export type UseSchedulePaneReturn = {
  contentViewportRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef: RefObject<HTMLDivElement | null>;
  handleCalendarScroll: (event: UIEvent<HTMLDivElement>) => void;

  currentDate: Date;
  selectedDate: Date;
  timelineTitleDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;
  timelineUnitBuffer: TimelineUnitBuffer;

  selectedViewMode: CalendarViewMode;
  activeMode: CalendarToolbarMode;
  setActiveMode: (mode: CalendarToolbarMode) => void;

  visibleDays: Date[];
  displayDays: Date[];

  timelineColumns: ReturnType<typeof buildTimelineColumns>;
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  titleDate: Date;
  monthLabel: string | null;

  calendarDayColumnWidth: number;
  timelineGridStyle: TimelineGridStyle;

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
  handleVisibleMonthChange: (date: Date) => void;
  handleMonthCellSelectDate: (date: Date) => void;

  setMonthTitleDate: (date: Date) => void;
};

export const useSchedulePane = (): UseSchedulePaneReturn => {
  const navigation = useCalendarNavigation();

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

  const timeline = useTimelineGrid({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    timelineUnitBuffer: navigation.timelineUnitBuffer,
  });

  const extendScrollLeft =
    navigation.activeMode === "timeline"
      ? navigation.extendTimelineUnitBufferLeft
      : navigation.extendCalendarBufferLeft;
  const extendScrollRight =
    navigation.activeMode === "timeline"
      ? navigation.extendTimelineUnitBufferRight
      : navigation.extendCalendarBufferRight;

  const scroll = useCalendarScrollController({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onExtendLeft: extendScrollLeft,
    onExtendRight: extendScrollRight,
    onTimelineVisibleDateChange: navigation.handleTimelineVisibleDateChange,
    scrollTargetToken: navigation.calendarScrollToken,
  });

  const google = useGoogleCalendarLayer();

  useCalendarEventSync({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    googleCalendar: {
      selectedCalendarIds: google.selectedCalendarIds,
      forceSyncRange: google.forceSyncRange,
    },
  });

  const googleAccounts: GoogleAccountDisplay[] = google.googleAccounts.map(
    (account) => {
      const taskListState = google.taskListsByAccount[account.id];

      return {
        accountId: account.id,
        email: account.email,
        name: account.name,
        photoUrl: account.photoUrl,
        calendars: account.calendars,
        taskLists: taskListState?.taskLists ?? [],
        isTaskListsLoading: taskListState?.isLoading ?? false,
        selectedCalendarIds: account.selectedCalendarIds,
        connectionStatus: account.connectionStatus,
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
    timelineTitleDate: navigation.timelineTitleDate,
    monthTitleDate: navigation.monthTitleDate,
    monthScrollTargetToken: navigation.monthScrollTargetToken,
    timelineUnitBuffer: navigation.timelineUnitBuffer,

    selectedViewMode: navigation.selectedViewMode,
    activeMode: navigation.activeMode,
    setActiveMode: navigation.setActiveMode,

    visibleDays,
    displayDays,

    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,

    titleDate:
      navigation.activeMode === "timeline"
        ? navigation.timelineTitleDate
        : layout.titleDate,
    monthLabel: layout.monthLabel,

    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    timelineGridStyle: layout.timelineGridStyle,

    googleAccounts,
    googleCalendarEvents: google.events,
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
    handleVisibleMonthChange: navigation.handleVisibleMonthChange,
    handleMonthCellSelectDate: navigation.handleMonthCellSelectDate,

    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};
