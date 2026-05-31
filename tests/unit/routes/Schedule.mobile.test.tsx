// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ScheduleRoute from "@/routes/Schedule";

vi.mock("@/pane.desktop/view/WorkspaceScreen", () => ({ WorkspaceScreen: () => React.createElement("div", { role: "menu", "aria-label": "layered project context menu", "data-testid": "desktop-schedule-screen" }) }));
vi.mock("@/pane.desktop/view/ScheduleScreen.mobile", () => ({ ScheduleScreen: () => React.createElement("div", { "data-testid": "mobile-schedule-screen" }) }));

const MOBILE_SCREEN_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/view/ScheduleScreen.mobile.tsx");

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
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Schedule mobile web route", () => {
  it("uses the mobile schedule screen and does not mount the desktop project context menu path", () => {
    render(React.createElement(ScheduleRoute));

    expect(screen.getByTestId("mobile-schedule-screen")).toBeTruthy();
    expect(screen.queryByTestId("desktop-schedule-screen")).toBeNull();
    expect(screen.queryByRole("menu", { name: "layered project context menu" })).toBeNull();
  });

  it("keeps the mobile schedule screen detached from desktop project sidebar context menus", () => {
    const source = readFileSync(MOBILE_SCREEN_SOURCE_PATH, "utf8");

    expect(source).not.toContain("CalendarSidebar");
    expect(source).not.toContain("SidebarLayeredDirectory");
    expect(source).not.toContain("ProjectListSidebar");
    expect(source).not.toContain("LayeredProjectMenu");
    expect(source).not.toContain("onContextMenu");
  });
});
