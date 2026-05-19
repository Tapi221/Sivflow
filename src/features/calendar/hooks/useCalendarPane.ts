import type { RefObject, UIEvent } from "react";
import { useCalendarNavigation } from "./useCalendarNavigation";
import { useCalendarLayout } from "./useCalendarLayout";
import { useCalendarVisibleRange } from "./useCalendarVisibleRange";
import { useTimelineGrid } from "./useTimelineGrid";
import { useCalendarScrollController } from "./useCalendarScrollController";
import { useGoogleCalendarLayer } from "./useGoogleCalendarLayer";
import { useCalendarEventSync } from "@/features/calendar/googlecalendar-sync/useCalendarEventSync";
import type {
  CalendarToolbarMode,
  CalendarViewMode,
  GoogleAccountDisplay,
  TimelineGridStyle,
} from "../calendarPane.types";
import type { GoogleCalendarEvent } from "../googlecalendar-integration/gcalSync.types";
import type { buildTimelineColumns } from "../grid/TimelineDayView.shared";

export type UseCalendarPaneReturn = {
  contentViewportRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  headerScrollRef: RefObject<HTMLDivElement | null>;

  currentDate: Date;
  selectedDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;

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
  removeGoogleAccount: (accountId: string) => void;
  toggleGoogleCalendar: (accountId: string, calendarId: string) => void;

  handleTimelineScroll: (event: UIEvent<HTMLDivElement>) => void;
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

export const useCalendarPane = (): UseCalendarPaneReturn => {
  const navigation = useCalendarNavigation();

  const visibleRange = useCalendarVisibleRange({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    calendarBuffer: navigation.calendarBuffer,
  });

  const layout = useCalendarLayout({
    viewportWidth: navigation.viewportWidth,
    visibleDays: visibleRange.visibleDays,
    displayDays: visibleRange.displayDays,
    selectedViewMode: navigation.selectedViewMode,
    currentDate: navigation.currentDate,
    calendarBuffer: navigation.calendarBuffer,
  });

  const timeline = useTimelineGrid({
    currentDate: navigation.currentDate,
    selectedViewMode: navigation.selectedViewMode,
    timelineUnitBuffer: navigation.timelineUnitBuffer,
  });

  const scroll = useCalendarScrollController({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays: visibleRange.visibleDays,
    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,
    calendarBuffer: navigation.calendarBuffer,
    viewportWidth: navigation.viewportWidth,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    onExtendLeft: navigation.extendCalendarBufferLeft,
    onExtendRight: navigation.extendCalendarBufferRight,
    scrollTargetToken: navigation.calendarScrollToken, // ← 追加
  });

  const google = useGoogleCalendarLayer();

  useCalendarEventSync({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays: visibleRange.visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    googleCalendar: {
      forceSync: google.forceSync,
      selectedCalendarIds: google.selectedCalendarIds,
    },
  });

  const googleAccounts: GoogleAccountDisplay[] = google.googleAccounts.map(
    (account) => ({
      accountId: account.id,
      email: account.email,
      calendars: account.calendars,
      selectedCalendarIds: account.selectedCalendarIds,
      syncState: account.syncState,
      error: account.error,
    }),
  );

  return {
    contentViewportRef: navigation.contentViewportRef,
    scrollContainerRef: scroll.scrollContainerRef,
    headerScrollRef: scroll.headerScrollRef,

    currentDate: navigation.currentDate,
    selectedDate: navigation.selectedDate,
    monthTitleDate: navigation.monthTitleDate,
    monthScrollTargetToken: navigation.monthScrollTargetToken,

    selectedViewMode: navigation.selectedViewMode,
    activeMode: navigation.activeMode,
    setActiveMode: navigation.setActiveMode,

    visibleDays: visibleRange.visibleDays,
    displayDays: visibleRange.displayDays,

    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,

    titleDate: layout.titleDate,
    monthLabel: layout.monthLabel,

    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    timelineGridStyle: layout.timelineGridStyle,

    googleAccounts,
    googleCalendarEvents: google.events,
    isAnyCalendarConnecting: google.isAnyConnecting,

    addGoogleCalendar: google.addAccount,
    removeGoogleAccount: google.removeAccount,
    toggleGoogleCalendar: google.toggleCalendar,

    handleTimelineScroll: scroll.handleTimelineScroll,
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