// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppLayout } from "@/layout/AppLayout";

type AppOutletContextStub = {
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
};
type MatchMediaListener = (event: MediaQueryListEvent) => void;

const LEFT_PANEL_COLLAPSED_STORAGE_KEY = "sivflow:layout:left-panel-collapsed";
const LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY = "flashcard-master:layout:left-panel-collapsed";
const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Outlet: ({ context }: { context?: AppOutletContextStub; }) => (
      <div data-is-left-panel-collapsed={String(context?.isLeftPanelCollapsed ?? false)} data-testid="app-outlet">
        <button type="button" onClick={context?.onToggleLeftPanel}>toggle left panel</button>
      </div>
    ),
    useNavigate: () => mockNavigate,
  };
});
vi.mock("@web-renderer/chip/panel/dialog.desktop/Dialog.SettingsWorkspaceRoot", () => ({
  SettingsWorkspaceRootPanel: ({ open }: { open: boolean; }) => <div data-open={String(open)} data-testid="settings-root-panel" />,
}));
vi.mock("@/features/settings/hooks/useThemeAccentColor", () => ({
  useThemeAccentColor: () => undefined,
}));
vi.mock("@/layout/hooks/useLayoutRouteState.desktop", () => ({
  useLayoutRouteStateDesktop: () => ({
    isScrollLocked: false,
    pathname: "/schedule",
  }),
}));
vi.mock("@/layout/hooks/useResetWorkspaceScroll.desktop", () => ({
  useResetWorkspaceScrollDesktop: () => undefined,
}));
vi.mock("@/layout/WorkspaceLayoutRevisionContext", () => ({
  WorkspaceLayoutRevisionProvider: ({ children }: { children: ReactNode; }) => children,
}));
vi.mock("@/layout/WorkspaceShell", () => ({
  WorkspaceShell: ({ children }: { children: ReactNode; }) => <main data-testid="workspace-shell">{children}</main>,
}));

const createMatchMedia = (matches: boolean) => {
  const listeners = new Set<MatchMediaListener>();
  return vi.fn((query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") {
        listeners.add(listener as MatchMediaListener);
      }
    },
    removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
      if (typeof listener === "function") {
        listeners.delete(listener as MatchMediaListener);
      }
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
const setMatchMedia = (matches: boolean) => {
  vi.stubGlobal("matchMedia", createMatchMedia(matches));
};
const renderAppLayout = () => {
  setMatchMedia(false);
  render(<AppLayout />);
};
const expectStoredCollapsedStateCleared = () => {
  expect(window.localStorage.getItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY)).toBeNull();
  expect(window.localStorage.getItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY)).toBeNull();
};
const seedStoredCollapsedState = () => {
  window.localStorage.setItem(LEFT_PANEL_COLLAPSED_STORAGE_KEY, "collapsed");
  window.localStorage.setItem(LEGACY_LEFT_PANEL_COLLAPSED_STORAGE_KEY, "collapsed");
};

afterEach(() => {
  cleanup();
  mockNavigate.mockClear();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AppLayout の左パネル折りたたみ状態", () => {
  it("保存済みの折りたたみ状態を reload 後に復元せず、保存キーを削除する", () => {
    seedStoredCollapsedState();
    renderAppLayout();
    expect(screen.getByTestId("workspace-shell")).not.toBeNull();
    expect(screen.getByTestId("app-outlet").getAttribute("data-is-left-panel-collapsed")).toBe("false");
    expectStoredCollapsedStateCleared();
  });
  it("左パネルを閉じても折りたたみ状態を localStorage に残さない", async () => {
    const user = userEvent.setup();
    renderAppLayout();
    await user.click(screen.getByRole("button", { name: "toggle left panel" }));
    expect(screen.getByTestId("app-outlet").getAttribute("data-is-left-panel-collapsed")).toBe("true");
    expectStoredCollapsedStateCleared();
  });
});
