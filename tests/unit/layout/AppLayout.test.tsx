// @vitest-environment jsdom
import React, { type ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/layout/AppLayout";
import { DESKTOP_LAYOUT_MEDIA_QUERY } from "@/layout/hooks/useDesktopLayoutMediaQuery";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    Outlet: () => <div data-testid="app-outlet" />,
  };
});

vi.mock("@/features/hotkey/useHotKey.desktop", () => ({
  useHotKeyDesktop: () => undefined,
}));

vi.mock("@/layout/hooks/useLayoutRouteState.desktop", () => ({
  useLayoutRouteStateDesktop: () => ({
    isFoldersRoute: false,
    isScrollLocked: false,
    pathname: "/schedule",
  }),
}));

vi.mock("@/layout/hooks/useResetWorkspaceScroll.desktop", () => ({
  useResetWorkspaceScrollDesktop: () => undefined,
}));

vi.mock("@/layout/WorkspaceShell", () => ({
  WorkspaceShell: ({ children }: { children: ReactNode }) => <main data-testid="workspace-shell">{children}</main>,
}));

vi.mock("@/pane.desktop/leftpane/Sidebar.desktop", () => ({
  Sidebar: () => <aside aria-label="Sidebar" data-testid="desktop-sidebar" />,
}));

vi.mock("@/pane.desktop/tab.desktopnative/hooks/useTabsRouteSync", () => ({
  useWorkspaceTabsRouteSync: () => undefined,
}));

vi.mock("@/platform/runtime", () => ({
  hasDesktopBridge: () => false,
  hasDesktopRuntime: () => false,
  isDesktopRuntime: () => false,
}));

type MatchMediaListener = (event: MediaQueryListEvent) => void;

const createMatchMedia = (matches: boolean) => {
  const listeners = new Set<MatchMediaListener>();

  return vi.fn((query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: "change", listener: MatchMediaListener) => {
      listeners.add(listener);
    },
    removeEventListener: (_type: "change", listener: MatchMediaListener) => {
      listeners.delete(listener);
    },
    addListener: (listener: MatchMediaListener) => {
      listeners.add(listener);
    },
    removeListener: (listener: MatchMediaListener) => {
      listeners.delete(listener);
    },
    dispatchEvent: () => true,
  }));
};

const setDesktopLayoutMatchMedia = (matches: boolean) => {
  vi.stubGlobal("matchMedia", createMatchMedia(matches));
};

const renderAppLayout = () => {
  render(<AppLayout />);
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AppLayout のサイドバー表示幅判定", () => {
  it("サイドバーを表示できる画面幅では左サイドバーを表示する", () => {
    setDesktopLayoutMatchMedia(true);

    renderAppLayout();

    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_LAYOUT_MEDIA_QUERY);
    expect(screen.getByTestId("desktop-sidebar")).not.toBeNull();
    expect(screen.getByTestId("workspace-shell")).not.toBeNull();
    expect(screen.getByTestId("app-outlet")).not.toBeNull();
    expect(document.querySelector(".app-layout")?.className).not.toContain("app-layout--without-sidebar");
  });

  it("サイドバーを表示できない画面幅では左サイドバーを表示しない", () => {
    setDesktopLayoutMatchMedia(false);

    renderAppLayout();

    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_LAYOUT_MEDIA_QUERY);
    expect(screen.queryByTestId("desktop-sidebar")).toBeNull();
    expect(screen.getByTestId("workspace-shell")).not.toBeNull();
    expect(screen.getByTestId("app-outlet")).not.toBeNull();
    expect(document.querySelector(".app-layout")?.className).toContain("app-layout--without-sidebar");
  });
});
