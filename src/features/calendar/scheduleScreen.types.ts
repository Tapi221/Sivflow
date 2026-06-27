import type { CSSProperties, ReactNode, RefObject, UIEvent } from "react";
import type { CalendarViewMode, CalendarViewModeSelection } from "./calendar.types";
import type { GCalConnectionStatus, GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import type { GoogleTaskItem, GoogleTaskListItem } from "@/sync/googletask-sync/gtaskSync.types";



type CalendarProvider = "local" | "google" | "appleEventKit" | "appleCalDav";
type ProjectCalendarSyncDirection = "importOnly" | "exportOnly" | "twoWay";
type GoogleCalendarColorOverrideMap = Record<string, string>;
type CalendarAllDayEventOrderMap = Record<string, string[]>;
type CalendarBufferDays = {
  before: number;
  after: number;
};
type CalendarGridStyle = CSSProperties & { "--calendar-hour-row-height": string;
};
type CalendarEventLabelStyle = CSSProperties & { "--calendar-event-start-hour": number;
  "--calendar-event-duration-hours": number;
  backgroundColor: string;
  borderLeftColor: string;
  borderLeftStyle: "solid";
  borderLeftWidth: number;
  color: string;
};
type ScheduleScreenProps = {
  isLeftPanelCollapsed?: boolean;
  onClose?: () => void;
  onToggleLeftPanel?: () => void;
  contentToolbar?: ReactNode;
};
type AppCalendarItem = {
  id: string;
  label: string;
  color: string;
  checked: boolean;
};
type ProjectCalendarLink = {
  id: string;
  projectId: string;
  provider: CalendarProvider;
  accountId: string;
  externalCalendarId: string;
  externalCalendarName: string;
  syncDirection: ProjectCalendarSyncDirection;
  createdByApp: boolean;
  color?: string;
  lastSyncedAt?: string;
};
type ProjectEventLink = {
  id: string;
  projectEventId: string;
  provider: CalendarProvider;
  accountId: string;
  externalCalendarId: string;
  externalEventId: string;
  lastSyncedAt: string;
  lastKnownExternalUpdatedAt?: string;
};
type GoogleAccountDisplay = {
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
type CalendarSelectionRange = {
  start: Date;
  end: Date;
};
type CalendarEventMoveRequest = {
  event: GoogleCalendarEvent;
  startsAt: Date;
  endsAt: Date;
  isAllDay: boolean;
};
type CalendarEventMoveHandler = (request: CalendarEventMoveRequest) => void | Promise<void>;
type CalendarAllDayEventReorderRequest = {
  eventKey: string;
  sourceDayKey: string;
  targetDayKey: string;
  orderedEventKeys: string[];
};
type CalendarAllDayEventReorderHandler = (request: CalendarAllDayEventReorderRequest) => void;
type CalendarSidebarProps = {
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
type CalendarWeekDayGridProps = {
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

export type { CalendarViewMode, CalendarViewModeSelection, CalendarProvider, ProjectCalendarSyncDirection, GoogleCalendarColorOverrideMap, CalendarAllDayEventOrderMap, CalendarBufferDays, CalendarGridStyle, CalendarEventLabelStyle, ScheduleScreenProps, AppCalendarItem, ProjectCalendarLink, ProjectEventLink, GoogleAccountDisplay, CalendarSelectionRange, CalendarEventMoveRequest, CalendarEventMoveHandler, CalendarAllDayEventReorderRequest, CalendarAllDayEventReorderHandler, CalendarSidebarProps, CalendarWeekDayGridProps };
