// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "@/pane.desktop/leftpane/Sidebar.desktop";

vi.mock("firebase/auth", () => ({
  signOut: vi.fn(),
}));

vi.mock("@/services/firebase", () => ({
  auth: {},
}));

const CLOSED_CLASS_NAME = "app-sidebar--closed";

const getClassNameList = (element: HTMLElement) => element.className.split(/\s+/);

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

afterEach(() => {
  cleanup();
});

describe("Sidebar", () => {
  it("トグルアイコンをクリックするとサイドバーを閉じ、もう一度クリックすると開く", async () => {
    const user = userEvent.setup();

    render(<SidebarHarness />);

    const sidebar = screen.getByRole("complementary", {
      name: "Sidebar",
    }) as HTMLElement;

    expect(getClassNameList(sidebar)).not.toContain(CLOSED_CLASS_NAME);

    await user.click(screen.getByRole("button", {
      name: "サイドバーを閉じる",
    }));

    expect(getClassNameList(sidebar)).toContain(CLOSED_CLASS_NAME);

    await user.click(screen.getByRole("button", {
      name: "サイドバーを開く",
    }));

    expect(getClassNameList(sidebar)).not.toContain(CLOSED_CLASS_NAME);
  });
});
