import type { CalendarYearEventDisplay, CalendarYearEventDisplayResolver } from "@/features/calendar/grid/CalendarView.year";
import type { AppCalendarItem, GoogleAccountDisplay, ProjectCalendarLink } from "./scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarEventSourcePriorityInput = {
  appProjects: AppCalendarItem[];
  projectCalendarLinks: ProjectCalendarLink[];
  googleAccounts: GoogleAccountDisplay[];
};



const PROJECT_EVENT_PRIORITY_GROUP = 0;
const GOOGLE_CALENDAR_EVENT_PRIORITY_GROUP = 1;
const FALLBACK_EVENT_PRIORITY_GROUP = 2;
const FALLBACK_EVENT_PRIORITY_INDEX = Number.MAX_SAFE_INTEGER;
const GOOGLE_CALENDAR_KEY_SEPARATOR = "\u001f";



const createGoogleCalendarSourceKey = (accountId: string, calendarId: string): string => `${accountId}${GOOGLE_CALENDAR_KEY_SEPARATOR}${calendarId}`;
const setUnambiguousValue = <T>(map: Map<string, T | null>, key: string, value: T): void => {
  if (!map.has(key)) {
    map.set(key, value);
    return;
  }

  if (map.get(key) !== value) {
    map.set(key, null);
  }
};
const buildProjectIndexById = (appProjects: AppCalendarItem[]): Map<string, number> => new Map(appProjects.map((project, index) => [project.id, index]));
const buildGoogleCalendarIndexMaps = (googleAccounts: GoogleAccountDisplay[]): { exact: Map<string, number>; fallback: Map<string, number | null>; } => {
  const exact = new Map<string, number>();
  const fallback = new Map<string, number | null>();
  let index = 0;

  for (const account of googleAccounts) {
    for (const calendar of account.calendars) {
      exact.set(createGoogleCalendarSourceKey(account.accountId, calendar.id), index);
      setUnambiguousValue(fallback, calendar.id, index);
      index += 1;
    }
  }

  return { exact, fallback };
};
const resolveLinkedProjectId = (event: GoogleCalendarEvent, projectCalendarLinks: ProjectCalendarLink[]): string | undefined => {
  const exactLink = event.accountId
    ? projectCalendarLinks.find((link) => link.provider === "google" && link.accountId === event.accountId && link.externalCalendarId === event.calendarId)
    : undefined;

  if (exactLink) return exactLink.projectId;

  const fallbackLinks = projectCalendarLinks.filter((link) => link.provider === "google" && link.externalCalendarId === event.calendarId);
  const fallbackProjectId = fallbackLinks[0]?.projectId;

  return fallbackProjectId && fallbackLinks.every((link) => link.projectId === fallbackProjectId) ? fallbackProjectId : undefined;
};
const resolveGoogleCalendarIndex = (event: GoogleCalendarEvent, googleCalendarIndexes: { exact: Map<string, number>; fallback: Map<string, number | null>; }): number => {
  if (event.accountId) {
    const exactIndex = googleCalendarIndexes.exact.get(createGoogleCalendarSourceKey(event.accountId, event.calendarId));
    if (exactIndex !== undefined) return exactIndex;
  }

  return googleCalendarIndexes.fallback.get(event.calendarId) ?? FALLBACK_EVENT_PRIORITY_INDEX;
};
const createCalendarYearEventDisplayResolver = ({ appProjects, projectCalendarLinks, googleAccounts }: CalendarEventSourcePriorityInput): CalendarYearEventDisplayResolver => {
  const projectById = new Map(appProjects.map((project) => [project.id, project]));
  const projectIndexById = buildProjectIndexById(appProjects);
  const googleCalendarIndexes = buildGoogleCalendarIndexMaps(googleAccounts);

  return (event): CalendarYearEventDisplay => {
    const projectId = event.projectId ?? resolveLinkedProjectId(event, projectCalendarLinks);
    const project = projectId ? projectById.get(projectId) : undefined;

    if (project) {
      return {
        color: project.color,
        priority: {
          group: PROJECT_EVENT_PRIORITY_GROUP,
          index: projectIndexById.get(project.id) ?? FALLBACK_EVENT_PRIORITY_INDEX,
        },
      };
    }

    return {
      priority: {
        group: event.accountId || event.calendarId ? GOOGLE_CALENDAR_EVENT_PRIORITY_GROUP : FALLBACK_EVENT_PRIORITY_GROUP,
        index: resolveGoogleCalendarIndex(event, googleCalendarIndexes),
      },
    };
  };
};



export { createCalendarYearEventDisplayResolver };
