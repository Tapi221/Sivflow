import type { CSSProperties, RefObject, UIEvent } from "react";

import type {
  CalendarToolbarMode,
  CalendarViewMode,
} from "@/features/calendar/calendar.types";
import type {
  GCalConnectionStatus,
  GoogleCalendarEvent,
  GoogleCalendarListItem,
} from "@/features/calendar/googlecalendar-integration/gcalSync.types";

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

export type SchedulePaneProps = {
  onClose?: () => void;
};

export type AppCalendarItem = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
};

// ─────────────────────────────────────────────────────────────
// マルチアカウント対応の型
// ─────────────────────────────────────────────────────────────

/** サイドバーに表示するための Google アカウント情報 */
export type GoogleAccountDisplay = {
  accountId: string;
  email: string | null;
  calendars: GoogleCalendarListItem[];
  selectedCalendarIds: Set<string>;
  syncState: "idle" | "syncing" | "needsReconnect" | "error";
  connectionStatus: GCalConnectionStatus;
  lastSyncedAt: Date | null;
  error: string | null;
};

export type CalendarSidebarProps = {
  monthDate: Date;
  selectedDate: Date;

  // マルチアカウント
  googleAccounts: GoogleAccountDisplay[];
  isAnyCalendarConnecting: boolean;

  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onAddCalendar: () => void;
  onReconnectAccount: (accountId: string) => void;
  onRetryAccount: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
  onToggleCalendar: (accountId: string, calendarId: string) => void;
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
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
};
