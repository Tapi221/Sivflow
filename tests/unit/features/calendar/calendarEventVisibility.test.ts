import { describe, expect, it } from "vitest";
import { attachCalendarEventDisplayMetadata, filterCalendarEventsBySourceVisibility } from "@/features/calendar/calendarEventVisibility";
import type { AppCalendarItem, GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarEvent } from "@/integration/googlecalendar-integration/gcalSync.types";

const createProject = (overrides: Partial<AppCalendarItem> = {}): AppCalendarItem => ({
  id: "project-chemistry",
  label: "Chemistry",
  color: "#34c759",
  checked: true,
  ...overrides,
});

const createAccount = (overrides: Partial<GoogleAccountDisplay> = {}): GoogleAccountDisplay => ({
  accountId: "account-1",
  email: "akari@example.com",
  name: null,
  photoUrl: null,
  accessToken: null,
  calendars: [
    {
      id: "calendar-chemistry",
      summary: "Chemistry",
      backgroundColor: "#4f7cff",
    },
  ],
  taskLists: [],
  taskListsError: null,
  isTaskListsLoading: false,
  googleTasks: [],
  googleTasksError: null,
  isGoogleTasksLoading: false,
  selectedCalendarIds: new Set(["calendar-chemistry"]),
  connectionStatus: "connected",
  error: null,
  ...overrides,
});

const createEvent = (overrides: Partial<GoogleCalendarEvent> = {}): GoogleCalendarEvent => ({
  id: "account-1:calendar-chemistry:event-1",
  externalId: "event-1",
  accountId: "account-1",
  calendarId: "calendar-chemistry",
  title: "Chemistry lab",
  startsAt: new Date(2026, 0, 1, 10),
  endsAt: new Date(2026, 0, 1, 11),
  isAllDay: false,
  accentColor: "#4f7cff",
  ...overrides,
});

const createProjectCalendarLink = (overrides: Partial<ProjectCalendarLink> = {}): ProjectCalendarLink => ({
  id: "project-calendar-link:google:account-1:calendar-chemistry",
  projectId: "project-chemistry",
  provider: "google",
  accountId: "account-1",
  externalCalendarId: "calendar-chemistry",
  externalCalendarName: "Chemistry",
  syncDirection: "importOnly",
  createdByApp: false,
  ...overrides,
});

describe("calendarEventVisibility", () => {
  it("hides events from a linked Google calendar when its project row is hidden", () => {
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [createEvent()],
      {
        appProjects: [createProject({ checked: false })],
        projectCalendarLinks: [createProjectCalendarLink()],
        googleAccounts: [createAccount()],
      },
    );

    expect(visibleEvents).toEqual([]);
  });

  it("assigns project metadata only from an explicit Google calendar link", () => {
    const [event] = attachCalendarEventDisplayMetadata(
      [createEvent()],
      {
        appProjects: [createProject()],
        projectCalendarLinks: [createProjectCalendarLink()],
        googleAccounts: [
          createAccount({
            calendars: [
              {
                id: "calendar-chemistry",
                summary: "Not Chemistry",
                backgroundColor: "#4f7cff",
              },
            ],
          }),
        ],
        googleCalendarColorOverrides: {},
      },
    );

    expect(event.projectId).toBe("project-chemistry");
  });

  it("uses account-specific explicit links when the same Google calendar id exists on multiple accounts", () => {
    const accountOneProject = createProject({ id: "project-account-one", label: "Account One", checked: false });
    const accountTwoProject = createProject({ id: "project-account-two", label: "Account Two", checked: true });
    const event = createEvent({ id: "account-2:calendar-chemistry:event-1", accountId: "account-2" });
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [event],
      {
        appProjects: [accountOneProject, accountTwoProject],
        projectCalendarLinks: [
          createProjectCalendarLink({ accountId: "account-1", projectId: "project-account-one" }),
          createProjectCalendarLink({ accountId: "account-2", projectId: "project-account-two" }),
        ],
        googleAccounts: [createAccount(), createAccount({ accountId: "account-2" })],
      },
    );

    expect(visibleEvents).toEqual([event]);
  });

  it("hides events whose projectId is a legacy project label", () => {
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [createEvent({ projectId: "Chemistry" })],
      {
        appProjects: [createProject({ checked: false })],
        projectCalendarLinks: [],
        googleAccounts: [createAccount()],
      },
    );

    expect(visibleEvents).toEqual([]);
  });

  it("does not use the Google calendar name as the source project without an explicit link", () => {
    const [event] = attachCalendarEventDisplayMetadata(
      [createEvent()],
      {
        appProjects: [createProject()],
        projectCalendarLinks: [],
        googleAccounts: [createAccount()],
        googleCalendarColorOverrides: {},
      },
    );

    expect(event.projectId).toBeUndefined();
  });

  it("does not use the Google calendar id as the source project without an explicit link", () => {
    const event = createEvent();
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [event],
      {
        appProjects: [createProject({ id: "calendar-chemistry", checked: false })],
        projectCalendarLinks: [],
        googleAccounts: [createAccount()],
      },
    );

    expect(visibleEvents).toEqual([event]);
  });

  it("keeps events visible when only a same-name hidden project exists", () => {
    const event = createEvent();
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [event],
      {
        appProjects: [createProject({ checked: false })],
        projectCalendarLinks: [],
        googleAccounts: [createAccount()],
      },
    );

    expect(visibleEvents).toEqual([event]);
  });

  it("keeps unrelated events visible when a hidden project does not own their source", () => {
    const event = createEvent({
      id: "account-1:calendar-physics:event-1",
      calendarId: "calendar-physics",
      title: "Physics",
    });
    const visibleEvents = filterCalendarEventsBySourceVisibility(
      [event],
      {
        appProjects: [createProject({ checked: false })],
        projectCalendarLinks: [],
        googleAccounts: [createAccount()],
      },
    );

    expect(visibleEvents).toEqual([event]);
  });
});
