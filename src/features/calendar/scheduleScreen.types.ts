import type { CSSProperties, RefObject, UIEvent } from "react";
import type { CalendarViewMode } from "@/features/calendar/calendar.types";
import type { GCalConnectionStatus, GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { GoogleTaskItem, GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";

export type { CalendarViewMode };

export type CalendarBufferDays = {
  before: number;
  after: number;
};

export type CalendarGridStyle = CSSProperties & {
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

export type ScheduleScreenProps = {
  onClose?: () => void;
};

export type AppCalendarItem = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
};

export type GoogleAccountDisplay = {
  accountId: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  calendars: GoogleCalendarListItem[];
  taskLists: GoogleTaskListItem[];
  taskListsError: string | null;
  isTaskListsLoading: boolean;
  googleTasks: GoogleTaskItem[];
  googleTasksError: string | null;
  isGoogleTasksLoading: boolean;
  selectedCalendarIds: Set<string>;
  connectionStatus: GCalConnectionStatus;
  error: string | null;
};

export type CalendarSelectionRange = {
  start: Date;
  end: Date;
};

export type CalendarSidebarProps = {
  monthDate: Date;
  selectedDate: Date;
  selectedRange?: CalendarSelectionRange | null;
  appProjects: AppCalendarItem[];
  googleAccounts: GoogleAccountDisplay[];
  isAnyCalendarConnecting: boolean;
  onSelectDate: (date: Date) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  onAddCalendar: () => void;
  onAddProject: (projectName: string) => void;
  onToggleProject: (projectId: string) => void;
  onReconnectAccount: (accountId: string) => void;
  onToggleCalendar: (accountId: string, calendarId: string) => void;
};

export type CalendarWorkspaceToolbarProps = {
  viewMode?: CalendarViewMode;
  onSelectViewMode?: (viewMode: CalendarViewMode) => void;
};

export type CalendarWeekDayGridProps = {
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef?: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  visibleDays: Date[];
  visibleEvents: GoogleCalendarEvent[];
  calendarDayColumnWidth: number;
  calendarGridStyle: CalendarGridStyle;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
};
