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
import type {
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "../googlecalendar-integration/useGoogleCalendarIntegration";
import type { buildTimelineColumns } from "../grid/TimelineDayView.shared";

// ── 戻り値の型を明示することで TS7022（循環推論エラー）を解消 ──
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
  displayDays: Date[];

  // ReturnType の動的 import をやめ、明示的な型エイリアスを使用
  timelineColumns: ReturnType<typeof buildTimelineColumns>;
  timelineColumnWidth: number;
  timelineAnchorColumnIndex: number;

  titleDate: Date;
  monthLabel: string | null;

  calendarDayColumnWidth: number;
  timelineGridStyle: React.CSSProperties;

  googleAccountEmail: string | null;
  // any → 具体的な型に変更（TS no-explicit-any 解消）
  googleCalendars: GoogleCalendarListItem[];
  googleCalendarError: string | null;
  googleCalendarEvents: GoogleCalendarEvent[];
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
  });

  const google = useGoogleCalendarLayer();

  useCalendarEventSync({
    activeMode: navigation.activeMode,
    selectedViewMode: navigation.selectedViewMode,
    visibleDays: visibleRange.visibleDays,
    monthTitleDate: navigation.monthTitleDate,
    googleCalendar: {
      forceSync: google.forceSync,
      // useCalendarEventSync の GoogleCalendarSlice は selectedCalendarIds: string[]
      // Set<string> → string[] に変換して渡す
      selectedCalendarIds: Array.from(google.selectedCalendarIds),
    },
  });

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

    googleAccountEmail: google.accountEmail,
    googleCalendars: google.calendars,
    googleCalendarError: google.error,
    googleCalendarEvents: google.events,
    isGoogleCalendarConnected: google.isConnected,
    isGoogleCalendarConnecting: google.isConnecting,
    selectedCalendarIds: google.selectedCalendarIds, // Set<string> のまま外部に渡す
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