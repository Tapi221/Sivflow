// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/services/firebase", () => ({
  auth: {},
}));

const ACTIVE_PAGE_ARIA_CURRENT = "page";
const CLOSED_CLASS_NAME = "app-sidebar--closed";
const SECTION_NAV_LABELS = ["Home", "Library", "Schedule", "設定"] as const;

const getClassNameList = (element: HTMLElement) => element.className.split(/\s+/);

const resetStores = () => {
  localStorage.clear();
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
      name: "Sidebar",
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
});
