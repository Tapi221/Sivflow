import type { AppCalendarItem, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink } from "./scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";



type CalendarEventSourceIndex = {
  projectById: Map<string, AppCalendarItem>;
  projectByNormalizedLabel: Map<string, AppCalendarItem>;
  linkedProjectIdByExactGoogleCalendarKey: Map<string, string>;
  linkedProjectIdByGoogleCalendarId: Map<string, string | null>;
};
type CalendarEventVisibilityInput = {
  appProjects: AppCalendarItem[];
  projectCalendarLinks: ProjectCalendarLink[];
  googleAccounts: GoogleAccountDisplay[];
};
type CalendarEventDisplayMetadataInput = CalendarEventVisibilityInput & {
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
};



const GOOGLE_CALENDAR_KEY_SEPARATOR = "\u001f";



const createGoogleCalendarColorOverrideKey = (accountId: string, calendarId: string): string => `${accountId}:${calendarId}`;
const createGoogleCalendarKey = (accountId: string, calendarId: string): string => `${accountId}${GOOGLE_CALENDAR_KEY_SEPARATOR}${calendarId}`;
const normalizeCalendarSourceLabel = (value: string): string => value.trim().toLowerCase();
const setUnambiguousValue = <T>(map: Map<string, T | null>, key: string, value: T): void => {
  if (!map.has(key)) {
    map.set(key, value);
    return;
  }

  if (map.get(key) !== value) {
    map.set(key, null);
  }
};
const createCalendarEventSourceIndex = ({ appProjects, projectCalendarLinks }: CalendarEventVisibilityInput): CalendarEventSourceIndex => {
  const projectById = new Map(appProjects.map((project) => [project.id, project]));
  const projectByNormalizedLabel = new Map(appProjects.map((project) => [normalizeCalendarSourceLabel(project.label), project]));
  const linkedProjectIdByExactGoogleCalendarKey = new Map<string, string>();
  const linkedProjectIdByGoogleCalendarId = new Map<string, string | null>();

  for (const link of projectCalendarLinks) {
    if (link.provider !== "google") continue;

    linkedProjectIdByExactGoogleCalendarKey.set(createGoogleCalendarKey(link.accountId, link.externalCalendarId), link.projectId);
    setUnambiguousValue(linkedProjectIdByGoogleCalendarId, link.externalCalendarId, link.projectId);
  }

  return {
    projectById,
    projectByNormalizedLabel,
    linkedProjectIdByExactGoogleCalendarKey,
    linkedProjectIdByGoogleCalendarId,
  };
};
const findProjectByIdOrLabel = (value: string | undefined, index: CalendarEventSourceIndex): AppCalendarItem | null => {
  if (!value) return null;

  return index.projectById.get(value) ?? index.projectByNormalizedLabel.get(normalizeCalendarSourceLabel(value)) ?? null;
};
const resolveGoogleCalendarLinkedProject = (event: GoogleCalendarEvent, index: CalendarEventSourceIndex): AppCalendarItem | null => {
  const exactProjectId = event.accountId ? index.linkedProjectIdByExactGoogleCalendarKey.get(createGoogleCalendarKey(event.accountId, event.calendarId)) : undefined;
  const fallbackProjectId = exactProjectId ?? index.linkedProjectIdByGoogleCalendarId.get(event.calendarId) ?? undefined;

  return findProjectByIdOrLabel(fallbackProjectId, index);
};
const resolveCalendarEventProject = (event: GoogleCalendarEvent, index: CalendarEventSourceIndex): AppCalendarItem | null => (
  resolveGoogleCalendarLinkedProject(event, index) ??
  findProjectByIdOrLabel(event.projectId, index)
);
const resolveGoogleEventAccentColor = (event: GoogleCalendarEvent, overrides: GoogleCalendarColorOverrideMap): string => {
  if (!event.accountId) return event.accentColor;

  return overrides[createGoogleCalendarColorOverrideKey(event.accountId, event.calendarId)] ?? event.accentColor;
};
const attachCalendarEventDisplayMetadata = (events: GoogleCalendarEvent[], input: CalendarEventDisplayMetadataInput): GoogleCalendarEvent[] => {
  const index = createCalendarEventSourceIndex(input);

  return events.map((event) => {
    const project = resolveCalendarEventProject(event, index);
    const accentColor = resolveGoogleEventAccentColor(event, input.googleCalendarColorOverrides);

    return {
      ...event,
      ...(project ? { projectId: project.id } : {}),
      accentColor,
    };
  });
};
const filterCalendarEventsBySourceVisibility = (events: GoogleCalendarEvent[], input: CalendarEventVisibilityInput): GoogleCalendarEvent[] => {
  const index = createCalendarEventSourceIndex(input);

  return events.filter((event) => {
    const project = resolveCalendarEventProject(event, index);

    return project?.checked !== false;
  });
};



export { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility };
