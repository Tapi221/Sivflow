// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { useLocaleStore } from "@shared/i18n/locale.store";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/services/firebase", () => ({
  auth: {},
}));

const ACTIVE_PAGE_ARIA_CURRENT = "page";
const CLOSED_CLASS_NAME = "app-sidebar--closed";
const SECTION_NAV_LABELS = ["ホーム", "ライブラリ", "スケジュール", "設定"] as const;

const getClassNameList = (element: HTMLElement) => element.className.split(/\s+/);

const mockHoverCapableMediaQuery = () => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const resetStores = () => {
  localStorage.clear();
  useLocaleStore.setState({ locale: "ja" });
  useSearchStore.setState({ isOpen: false, query: "", sources: {} });
  useWorkspaceTabsStore.setState({ tabs: [], activeTabId: null, lastOpenedTabId: null });
};

const SidebarHarness = () => {
  const [isClosed, setIsClosed] = useState(false);

  return (
    <Sidebar
      isClosed={isClosed}
      onToggleClosed={() => {
        setIsClosed((current) => !current);
      }}
    />
  );
};

beforeEach(() => {
  resetStores();
});

afterEach(() => {
  cleanup();
  resetStores();
});

describe("Sidebar", () => {
  it("トグルアイコンは閉じる状態と開く状態を切り替え、操作名も現在状態に合わせて変える", async () => {
    const user = userEvent.setup();

    render(<SidebarHarness />);

    const sidebar = screen.getByRole("complementary", {
      name: "サイドバー",
    }) as HTMLElement;

    const closeButton = screen.getByRole("button", {
      name: "サイドバーを閉じる",
    });

    expect(getClassNameList(sidebar)).not.toContain(CLOSED_CLASS_NAME);
    expect(closeButton.getAttribute("aria-label")).toBe("サイドバーを閉じる");

    await user.click(closeButton);

    const openButton = screen.getByRole("button", {
      name: "サイドバーを開く",
    });

    expect(getClassNameList(sidebar)).toContain(CLOSED_CLASS_NAME);
    expect(openButton.getAttribute("aria-label")).toBe("サイドバーを開く");

    await user.click(openButton);

    expect(getClassNameList(sidebar)).not.toContain(CLOSED_CLASS_NAME);
    expect(screen.getByRole("button", {
      name: "サイドバーを閉じる",
    }).getAttribute("aria-label")).toBe("サイドバーを閉じる");
  });

  it("セクションを持つアイコンはクリックした画面をアクティブ表示にする", async () => {
    const user = userEvent.setup();

    render(<Sidebar />);

    for (const label of SECTION_NAV_LABELS) {
      const navButton = screen.getByRole("button", {
        name: label,
      });

      await user.click(navButton);

      await waitFor(() => {
        expect(navButton.getAttribute("aria-current")).toBe(ACTIVE_PAGE_ARIA_CURRENT);
      });
    }
  });

  it("探すアイコンは検索を開き、サイドバーのアクティブセクションは変更しない", async () => {
    const user = userEvent.setup();

    render(<Sidebar />);

    expect(useSearchStore.getState().isOpen).toBe(false);
    expect(useWorkspaceTabsStore.getState().activeTabId).toBeNull();

    await user.click(screen.getByRole("button", {
      name: "探す",
    }));

    await waitFor(() => {
      expect(useSearchStore.getState().isOpen).toBe(true);
    });

    expect(useWorkspaceTabsStore.getState().activeTabId).toBeNull();
  });

  it("日本語ロケールではサイドバー項目のツールチップも日本語で表示する", async () => {
    const user = userEvent.setup();
    mockHoverCapableMediaQuery();

    render(<Sidebar />);

    await user.hover(screen.getByRole("button", {
      name: "スケジュール",
    }));

    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe("スケジュール");
    });
  });

  it("英語ロケールではサイドバー項目とツールチップを英語で表示する", async () => {
    const user = userEvent.setup();
    mockHoverCapableMediaQuery();
    useLocaleStore.setState({ locale: "en" });

    render(<Sidebar />);

    expect(screen.getByRole("complementary", {
      name: "Sidebar",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Home",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Library",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Tags",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Explore",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Settings",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Log out",
    })).toBeDefined();
    expect(screen.getByRole("button", {
      name: "Close sidebar",
    })).toBeDefined();
    expect(screen.queryByRole("button", {
      name: "スケジュール",
    })).toBeNull();

    await user.hover(screen.getByRole("button", {
      name: "Schedule",
    }));

    await waitFor(() => {
      expect(screen.getByRole("tooltip").textContent).toBe("Schedule");
    });
  });
});
