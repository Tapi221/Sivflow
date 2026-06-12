// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ScheduleRoute } from "@/routes/Schedule";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

vi.mock("@/pane.desktop/view/WorkspaceScreen", () => ({ WorkspaceScreen: () => React.createElement("div", { "data-testid": "mobile-library-workspace-screen" }) }));
vi.mock("@/pane.desktop/view/ScheduleScreen.mobile", () => ({ ScheduleScreen: () => React.createElement("div", { "data-testid": "mobile-schedule-screen" }) }));

const MOBILE_SCREEN_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/view/ScheduleScreen.mobile.tsx");
const WORKSPACE_SCREEN_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/view/WorkspaceScreen.tsx");
const LAYERED_DIRECTORY_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/Sidebar.LayeredDirectory.tsx");

const installMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

beforeEach(() => {
  installMatchMedia(true);
  useWorkspaceTabsStore.setState({ tabs: [], activeTabId: null, lastOpenedTabId: null });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useWorkspaceTabsStore.setState({ tabs: [], activeTabId: null, lastOpenedTabId: null });
});

describe("Schedule mobile web route", () => {
  it("モバイルのスケジュール画面を使用し、ライブラリワークスペースをマウントしない", () => {
    render(React.createElement(ScheduleRoute));

    expect(screen.getByTestId("mobile-schedule-screen")).toBeTruthy();
    expect(screen.queryByTestId("mobile-library-workspace-screen")).toBeNull();
  });

  it("モバイルのライブラリタブはワークスペース画面に流す", () => {
    useWorkspaceTabsStore.setState({
      tabs: [{ id: "explorer:default", kind: "explorer", title: "Library", explorerState: { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null }, isClosable: true, sectionKey: "library" }],
      activeTabId: "explorer:default",
      lastOpenedTabId: "explorer:default",
    });

    render(React.createElement(ScheduleRoute));

    expect(screen.getByTestId("mobile-library-workspace-screen")).toBeTruthy();
    expect(screen.queryByTestId("mobile-schedule-screen")).toBeNull();
  });

  it("モバイルのライブラリ画面をカレンダー画面と同じサイドバー内容にする", () => {
    const scheduleSource = readFileSync(MOBILE_SCREEN_SOURCE_PATH, "utf8");
    const workspaceSource = readFileSync(WORKSPACE_SCREEN_SOURCE_PATH, "utf8");
    const layeredDirectorySource = readFileSync(LAYERED_DIRECTORY_SOURCE_PATH, "utf8");

    expect(scheduleSource).toContain("MobileSidebarDrawer");
    expect(scheduleSource).toContain("useProjectCalendarActions");
    expect(workspaceSource).toContain("MobileSidebarDrawer");
    expect(workspaceSource).toContain("MOBILE_WORKSPACE_SIDEBAR_ID");
    expect(workspaceSource).toContain("CalendarSidebarController onOpenSettings={onOpenSettings} onToggleLeftPanel={handleCloseMobileSidebar}");
    expect(workspaceSource).not.toContain("MOBILE_LIBRARY_SIDEBAR_ID");
    expect(layeredDirectorySource).toContain("const shouldShowCalendarContent = calendarContent !== undefined");
  });
});
