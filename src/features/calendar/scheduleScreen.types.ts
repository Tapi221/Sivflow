import type { CSSProperties, RefObject, UIEvent } from "react";
import type { GCalConnectionStatus, GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { GoogleTaskItem, GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";
import type { CalendarViewMode, CalendarViewModeSelection } from "./calendar.types";

export type { CalendarViewMode, CalendarViewModeSelection };

export type CalendarProvider = "local" | "google" | "appleEventKit" | "appleCalDav";

export type ProjectCalendarSyncDirection = "importOnly" | "exportOnly" | "twoWay";

export type GoogleCalendarColorOverrideMap = Record<string, string>;

export type CalendarAllDayEventOrderMap = Record<string, string[]>;

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
  isLeftPanelCollapsed?: boolean;
  onClose?: () => void;
  onToggleLeftPanel?: () => void;
};

export type AppCalendarItem = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
};

export type ProjectCalendarLink = {
  id: string;
  projectId: string;
  provider: CalendarProvider;
  accountId: string;
  externalCalendarId: string;
  externalEventId: string;
  externalCalendarName: string;
  syncDirection: ProjectCalendarSyncDirection;
  createdByApp: boolean;
  color?: string;
  lastSyncedAt?: string;
};

export type ProjectEventLink = {
  id: string;
  projectEventId: string;
  provider: CalendarProvider;
  accountId: string;
  externalCalendarId: string;
  externalEventId: string;
  lastSyncedAt: string;
  lastKnownExternalUpdatedAt?: string;
};

export type GoogleAccountDisplay = {
  accountId: string;
  email: string | null;
  name: string | null;
  photoUrl: string | null;
  accessToken: string | null;
  calendars: GoogleCalendarListItem[];
  taskLists: GoogleTaskListItem[];
  taskListsError: string | null;
  isTaskListsLoading: boolean;
  googleTasks: GoogleTaskItem[];
  googleTasksError: string | null;
  selectedCalendarIds: Set<string>;
  connectionStatus: GCalConnectionStatus;
  error: string | null;
};

export type CalendarSelectionRange = {
  start: Date;
  end: Date;
};

export type CalendarEventMoveRequest = {
  event: GoogleCalendarEvent;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
};

export type CalendarEventMoveHandler = (request: CalendarEventMoveRequest) => void | Promise<void>;

export type CalendarAllDayEventReorderRequest = {
  eventKey: string;
  sourceDayKey: string;
  targetDayKey: string;
  orderedEventKeys: string[];
};

export type CalendarAllDayEventReorderHandler = (request: CalendarAllDayEventReorderRequest) => void;

export type CalendarSidebarProps = {
  appProjects: AppCalendarItem[];
  projectCalendarLinks: ProjectCalendarLink[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
  googleAccounts: GoogleAccountDisplay[];
  isAnyCalendarConnecting: boolean;
  onAddCalendar: () => void;
  onAddProject: (projectName: string) => void;
  onToggleProject: (projectId: string) => void;
  onLinkGoogleCalendarAsProject: (accountId: string, calendarId: string) => void;
  onLinkProjectToGoogleCalendar: (projectId: string, accountId: string, calendarId: string) => void;
  onCreateProjectGoogleCalendar: (projectId: string, accountId: string) => void;
  onUnlinkProjectCalendar: (linkId: string) => void;
  onChangeGoogleCalendarColor: (accountId: string, calendarId: string, color: string) => void;
  onReconnectAccount: (accountId: string) => void;
  onToggleCalendar: (accountId: string, calendarId: string) => void;
  onToggleLeftPanel?: () => void;
};

export type CalendarWeekDayGridProps = {
  headerScrollRef: RefObject<HTMLDivElement | null>;
  allDayScrollRef?: RefObject<HTMLDivElement | null>;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  visibleDays: Date[];
  visibleEvents: GoogleCalendarEvent[];
  calendarGridStyle: CalendarGridStyle;
  hourLabelDisplay?: "full" | "compact";
  allDayEventOrder?: CalendarAllDayEventOrderMap;
  onScroll?: (event: UIEvent<HTMLDivElement>) => void;
  selectedDate: Date;
  onSelectDate?: (date: Date) => void;
  onMoveCalendarEvent?: CalendarEventMoveHandler;
  onReorderAllDayEvents?: CalendarAllDayEventReorderHandler;
};
