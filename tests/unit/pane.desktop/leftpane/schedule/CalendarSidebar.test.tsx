// @vitest-environment jsdom

import React from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CalendarSidebarProps, GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { CalendarSidebar } from "@/pane.desktop/leftpane/schedule/CalendarSidebar";

type WorkspaceTabsState = {
  activeTabId: string | null;
  tabs: { id: string; sectionKey?: string }[];
};

const workspaceTabsState: WorkspaceTabsState = {
  activeTabId: null,
  tabs: [],
};

vi.mock("@/chip/icons/icons.schedule", () => ({
  CalendarIcon: ({ className }: { className?: string }) => <svg data-testid="my-projects-calendar-icon" className={className} aria-label="calendar icon" />,
  GoogleIcon: ({ className, label }: { className?: string; label?: string }) => <svg data-testid="google-icon" className={className} aria-label={label ?? "Google"} />,
}));

vi.mock("@/chip/rightclickpanel.desktop/CalendarListMenu.desktop", () => ({
  CALENDAR_LIST_MENU_HEIGHT: 96,
  CALENDAR_LIST_MENU_PANEL_ID: "calendar-list-menu",
  CALENDAR_LIST_MENU_WIDTH: 200,
  CalendarListMenu: () => <div data-testid="calendar-list-menu" />,
}));

vi.mock("@/chip/rightclickpanel.desktop/ProjectCalendarLinksMenu.desktop", () => ({
  PROJECT_CALENDAR_LINKS_MENU_PANEL_ID: "project-calendar-links-menu",
  PROJECT_CALENDAR_LINKS_MENU_WIDTH: 240,
  ProjectCalendarLinksMenu: () => <div data-testid="project-calendar-links-menu" />,
  getProjectCalendarLinksMenuHeight: () => 96,
}));

vi.mock("@/chip/rightclickpanel.desktop/rightClickPanel.utils", () => ({
  RIGHT_CLICK_PANEL_NO_DRAG_STYLE: {},
  clampRightClickPanelPosition: (x: number, y: number) => ({ x, y }),
  useRightClickPanelDismiss: vi.fn(),
}));

vi.mock("@/features/calendar/panel/SelectableGoogleSourceRow", () => ({
  GOOGLE_SOURCE_ROW_CLASS_NAME: "google-source-row",
  SelectableGoogleSourceRow: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock("@/pane.desktop/leftpane/Sidebar.LayeredDirectory", () => ({
  SidebarLayeredDirectory: () => <aside data-testid="layered-directory" />,
}));

vi.mock("@/pane.desktop/tab.desktopnative/hooks/useTabsStore", () => ({
  useWorkspaceTabsStore: <T,>(selector: (state: WorkspaceTabsState) => T): T => selector(workspaceTabsState),
}));

vi.mock("@shared/i18n/useT", () => ({
  useT: () => ({ myProjects: "MY PROJECTS" }),
}));

const createGoogleAccountDisplay = (): GoogleAccountDisplay => ({
  accountId: "google-account-1",
  email: "akari.tt221@gmail.com",
  name: null,
  photoUrl: null,
  accessToken: null,
  calendars: [{ id: "calendar-1", summary: "Primary" }],
  taskLists: [],
  taskListsError: null,
  isTaskListsLoading: false,
  googleTasks: [],
  googleTasksError: null,
  selectedCalendarIds: new Set(["calendar-1"]),
  connectionStatus: "connected",
  error: null,
});

const createCalendarSidebarProps = (): CalendarSidebarProps => ({
  appProjects: [],
  projectCalendarLinks: [],
  googleCalendarColorOverrides: {},
  googleAccounts: [],
  isAnyCalendarConnecting: false,
  onAddCalendar: vi.fn(),
  onAddProject: vi.fn(),
  onToggleProject: vi.fn(),
  onLinkGoogleCalendarAsProject: vi.fn(),
  onLinkProjectToGoogleCalendar: vi.fn(),
  onCreateProjectGoogleCalendar: vi.fn(),
  onUnlinkProjectCalendar: vi.fn(),
  onChangeGoogleCalendarColor: vi.fn(),
  onReconnectAccount: vi.fn(),
  onToggleCalendar: vi.fn(),
});

const hasCalendarListDividerClass = (calendarList: HTMLElement): boolean => Array.from(calendarList.querySelectorAll("*")).some((element) => element.classList.contains("border-t") || element.classList.contains("border-[#eeeeee]"));

describe("CalendarSidebar", () => {
  afterEach(() => {
    cleanup();
    workspaceTabsState.activeTabId = null;
    workspaceTabsState.tabs = [];
  });

  it("MY PROJECTS の見出しにカレンダーアイコンを描画しない", () => {
    render(<CalendarSidebar {...createCalendarSidebarProps()} />);

    const myProjectsButton = screen.getByRole("button", { name: /MY PROJECTS/ });

    expect(within(myProjectsButton).queryByTestId("my-projects-calendar-icon")).toBeNull();
  });

  it("GOOGLE CALENDARS のセクション見出しと追加ボタンを描画しない", () => {
    render(<CalendarSidebar {...createCalendarSidebarProps()} googleAccounts={[createGoogleAccountDisplay()]} />);

    expect(screen.queryByText("GOOGLE CALENDARS")).toBeNull();
    expect(screen.queryByRole("button", { name: "Googleカレンダーを追加" })).toBeNull();
    expect(screen.queryByRole("button", { name: "akari.tt221" })).not.toBeNull();
  });

  it("MY PROJECTS と Google アカウント一覧の間に区切り線を描画しない", () => {
    render(<CalendarSidebar {...createCalendarSidebarProps()} googleAccounts={[createGoogleAccountDisplay()]} />);

    const calendarList = screen.getByRole("navigation", { name: "カレンダー一覧" });

    expect(hasCalendarListDividerClass(calendarList)).toBe(false);
  });
});
