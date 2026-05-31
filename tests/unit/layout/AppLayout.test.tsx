// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
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
  Sidebar: ({ isClosed = false, onToggleClosed }: { isClosed?: boolean; onToggleClosed?: () => void }) => (
    <aside aria-label="Sidebar" data-is-closed={String(isClosed)} data-testid="desktop-sidebar">
      <button type="button" onClick={onToggleClosed} aria-label={isClosed ? "サイドバーを開く" : "サイドバーを閉じる"}>
        {isClosed ? "開く" : "閉じる"}
      </button>
    </aside>
  ),
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

const SIDEBAR_CLOSED_LAYOUT_CLASS_NAME = "app-layout--sidebar-closed";
const WITHOUT_SIDEBAR_LAYOUT_CLASS_NAME = "app-layout--without-sidebar";

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

const getAppLayout = () => document.querySelector(".app-layout") as HTMLElement;

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
  it("画面幅が 768px 以上なら左サイドバーを表示する", () => {
    setDesktopLayoutMatchMedia(true);

    renderAppLayout();

    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_LAYOUT_MEDIA_QUERY);
    expect(screen.getByTestId("desktop-sidebar")).not.toBeNull();
    expect(screen.getByTestId("workspace-shell")).not.toBeNull();
    expect(screen.getByTestId("app-outlet")).not.toBeNull();
    expect(getAppLayout().className).not.toContain(WITHOUT_SIDEBAR_LAYOUT_CLASS_NAME);
  });

  it("画面幅が 768px 未満なら左サイドバーを表示しない", () => {
    setDesktopLayoutMatchMedia(false);

    renderAppLayout();

    expect(window.matchMedia).toHaveBeenCalledWith(DESKTOP_LAYOUT_MEDIA_QUERY);
    expect(screen.queryByTestId("desktop-sidebar")).toBeNull();
    expect(screen.getByTestId("workspace-shell")).not.toBeNull();
    expect(screen.getByTestId("app-outlet")).not.toBeNull();
    expect(getAppLayout().className).toContain(WITHOUT_SIDEBAR_LAYOUT_CLASS_NAME);
  });

  it("左サイドバーのトグルを押すとレイアウト全体も閉じた状態になり、再度押すと開いた状態に戻る", async () => {
    const user = userEvent.setup();

    setDesktopLayoutMatchMedia(true);
    renderAppLayout();

    const sidebar = screen.getByTestId("desktop-sidebar");

    expect(sidebar.getAttribute("data-is-closed")).toBe("false");
    expect(getAppLayout().className).not.toContain(SIDEBAR_CLOSED_LAYOUT_CLASS_NAME);

    await user.click(screen.getByRole("button", {
      name: "サイドバーを閉じる",
    }));

    expect(screen.getByTestId("desktop-sidebar").getAttribute("data-is-closed")).toBe("true");
    expect(getAppLayout().className).toContain(SIDEBAR_CLOSED_LAYOUT_CLASS_NAME);

    await user.click(screen.getByRole("button", {
      name: "サイドバーを開く",
    }));

    expect(screen.getByTestId("desktop-sidebar").getAttribute("data-is-closed")).toBe("false");
    expect(getAppLayout().className).not.toContain(SIDEBAR_CLOSED_LAYOUT_CLASS_NAME);
  });
});
