import { describe, expect, it } from "vitest";
import { createCalendarYearEventDisplayResolver } from "@/features/calendar/calendarEventSourcePriority";
import type { AppCalendarItem, GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent, GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";

const createProject = (id: string, label: string, color: string): AppCalendarItem => ({
  id,
  label,
  color,
  checked: true,
});

const createCalendar = (id: string, summary: string, backgroundColor: string): GoogleCalendarListItem => ({
  id,
  summary,
  backgroundColor,
});

const createAccount = (accountId: string, calendars: GoogleCalendarListItem[]): GoogleAccountDisplay => ({
  accountId,
  email: null,
  name: null,
  photoUrl: null,
  accessToken: null,
  calendars,
  taskLists: [],
  taskListsError: null,
  isTaskListsLoading: false,
  googleTasks: [],
  googleTasksError: null,
  selectedCalendarIds: new Set(calendars.map((calendar) => calendar.id)),
  connectionStatus: "connected",
  error: null,
});

const createLink = (projectId: string, accountId: string, calendarId: string): ProjectCalendarLink => ({
  id: `${projectId}:${accountId}:${calendarId}`,
  projectId,
  provider: "google",
  accountId,
  externalCalendarId: calendarId,
  externalCalendarName: calendarId,
  syncDirection: "importOnly",
  createdByApp: false,
});

const createEvent = (calendarId: string, accountId?: string): GoogleCalendarEvent => ({
  id: `${accountId ?? "local"}:${calendarId}:event`,
  accountId,
  calendarId,
  accentColor: "#999999",
  title: "event",
  startsAt: new Date(2026, 0, 1),
  endsAt: new Date(2026, 0, 1, 1),
  isAllDay: false,
});

describe("createCalendarYearEventDisplayResolver", () => {
  it("プロジェクトに紐づく予定はカレンダー予定より優先し、プロジェクト色を使う", () => {
    const topProject = createProject("project-top", "Top", "#111111");
    const linkedProject = createProject("project-linked", "Linked", "#222222");
    const calendar = createCalendar("calendar-linked", "Linked", "#999999");
    const account = createAccount("account", [calendar]);
    const resolver = createCalendarYearEventDisplayResolver({
      appProjects: [topProject, linkedProject],
      projectCalendarLinks: [createLink(linkedProject.id, account.accountId, calendar.id)],
      googleAccounts: [account],
    });

    const projectDisplay = resolver(createEvent(calendar.id, account.accountId));
    const plainCalendarDisplay = resolver(createEvent("unlinked-calendar", account.accountId));

    expect(projectDisplay.color).toBe(linkedProject.color);
    expect(projectDisplay.priority.group).toBeLessThan(plainCalendarDisplay.priority.group);
  });

  it("複数のプロジェクト予定では sidebar の上にあるプロジェクトを優先する", () => {
    const topProject = createProject("project-top", "Top", "#111111");
    const bottomProject = createProject("project-bottom", "Bottom", "#222222");
    const resolver = createCalendarYearEventDisplayResolver({
      appProjects: [topProject, bottomProject],
      projectCalendarLinks: [],
      googleAccounts: [],
    });

    const topDisplay = resolver({ ...createEvent("top-calendar"), projectId: topProject.id });
    const bottomDisplay = resolver({ ...createEvent("bottom-calendar"), projectId: bottomProject.id });

    expect(topDisplay.priority.index).toBeLessThan(bottomDisplay.priority.index);
    expect(topDisplay.color).toBe(topProject.color);
  });
});
