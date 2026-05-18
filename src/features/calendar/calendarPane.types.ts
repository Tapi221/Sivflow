import type { CSSProperties, RefObject, UIEvent } from "react";
import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";
import type {
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "@/features/calendar/hooks/useGoogleCalendarIntegration";

// calendar.types.ts から re-export（後方互換のため）
export type { CalendarToolbarMode, CalendarViewMode };

export type TimelineBufferDays = {
  before: number;
  after: number;
};

export type TimelineGridStyle = CSSProperties & {
  "--calendar-hour-row-height": string;
};

export type CalendarEventLabelStyle = CSSProperties & {
  "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
  backgroundColor: string;
  borderLeftColor: string;
  borderLeftStyle: "solid";
  borderLeftWidth: number;
  color: string;
};

export type CalendarPaneProps = {
  onClose?: () => void;
};

export type AppCalendarItem = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
};

export type CalendarSidebarProps = {
  monthDate: Date;
  selectedDate: Date;
  calendars: GoogleCalendarListItem[];
  googleAccountEmail: string | null;
  selectedCalendarIds: Set<string>;
  calendarError: string | null;
  isCalendarConnected: boolean;
  isCalendarConnecting: boolean;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onClose: () => void;
  onConnectCalendar: () => void;
  onToggleCalendar: (calendarId: string) => void;
};

export type CalendarWorkspaceToolbarProps = {
  activeMode: CalendarToolbarMode;
  viewMode?: CalendarViewMode;
  onSelectCalendar: () => void;
  onSelectTimeline: () => void;
  onSelectTask: () => void;
  onSelectViewMode?: (viewMode: CalendarViewMode) => void;
};

export type CalendarWeekDayGridProps = {
  headerScrollRef: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  visibleDays: Date[];
  visibleEvents: GoogleCalendarEvent[];
  calendarDayColumnWidth: number;
  timelineGridStyle: TimelineGridStyle;
  onScroll: (event: UIEvent<HTMLDivElement>) => void;
};
