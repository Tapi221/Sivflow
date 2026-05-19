import type { UIEvent } from "react";
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
} from "../calendarPane.types";

export type UseCalendarPaneReturn = {
  contentViewportRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;

  currentDate: Date;
  selectedDate: Date;
  monthTitleDate: Date;
  monthScrollTargetToken: number;

  selectedViewMode: CalendarViewMode;
  activeMode: CalendarToolbarMode;
  setActiveMode: (mode: CalendarToolbarMode) => void;

  visibleDays: Date[];
  timelineColumns: ReturnType<
    typeof import("../grid/TimelineDayView.shared").buildTimelineColumns
  >;
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  titleDate: Date;
  monthLabel: string | null;

  calendarDayColumnWidth: number;
  timelineGridStyle: React.CSSProperties;

  googleAccountEmail: string | null;
  googleCalendars: any;
  googleCalendarError: string | null;
  googleCalendarEvents: any;
  isGoogleCalendarConnected: boolean;
  isGoogleCalendarConnecting: boolean;
  selectedCalendarIds: Set<string>;
  connectGoogleCalendar: () => Promise<void>;
  toggleGoogleCalendar: (id: string) => void;

  handleTimelineScroll: (event: UIEvent<HTMLDivElement>) => void;
  handleSelectViewMode: (viewMode: CalendarViewMode) => void;
  handleToday: () => void;
  handlePrevious: () => void;
  handleNext: () => void;

  handleSidebarPreviousMonth: () => void;
  handleSidebarNextMonth: () => void;
  handleSidebarSelectDate: (date: Date) => void;
  handleVisibleMonthChange: (date: Date) => void;

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
  });

  const google = useGoogleCalendarLayer();

  const selectedCalendarIdList = Array.from(google.selectedCalendarIds);

  useCalendarEventSync({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays: visibleRange.visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    googleCalendar: {
      forceSync: google.forceSync,
      selectedCalendarIds: selectedCalendarIdList,
    },
  });

  return {
    contentViewportRef: navigation.contentViewportRef,

    // ★修正ポイント：navigation → scroll
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

    timelineColumns: timeline.timelineColumns,
    timelineColumnWidth: timeline.timelineColumnWidth,
    timelineAnchorColumnIndex: timeline.timelineAnchorColumnIndex,

    titleDate: layout.titleDate,
    monthLabel: layout.monthLabel,
    calendarDayColumnWidth: layout.calendarDayColumnWidth,
    timelineGridStyle: layout.timelineGridStyle,

    googleAccountEmail: google.accountEmail,
    googleCalendars: google.calendars,
    googleCalendarError: google.error,
    googleCalendarEvents: google.events,
    isGoogleCalendarConnected: google.isConnected,
    isGoogleCalendarConnecting: google.isConnecting,
    selectedCalendarIds: google.selectedCalendarIds,
    connectGoogleCalendar: google.connect,
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

    setMonthTitleDate: navigation.setMonthTitleDate,
  };
};