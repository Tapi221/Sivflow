// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TrashPage from "@web-renderer/features/trash/TrashPage";

const { emptyMock, permanentlyDeleteMock, refreshMock, restoreMock, trashState } = vi.hoisted(() => ({
  emptyMock: vi.fn(),
  permanentlyDeleteMock: vi.fn(),
  refreshMock: vi.fn(),
  restoreMock: vi.fn(),
  trashState: {
    items: {
      folders: [],
      cards: [],
      cardSets: [],
      documents: [],
    },
    status: "ready",
    errorMessage: null as string | null,
  },
}));

vi.mock("@/contexts/auth/useAuthSession", () => ({
  useAuthSession: () => ({
    currentUser: { uid: "user-1" },
    loading: false,
  }),
}));

vi.mock("@web-renderer/features/trash/useTrashItems", () => ({
  useTrashItems: () => ({
    items: trashState.items,
    status: trashState.status,
    errorMessage: trashState.errorMessage,
    refresh: refreshMock,
    restore: restoreMock,
    permanentlyDelete: permanentlyDeleteMock,
    empty: emptyMock,
  }),
}));

const getRow = (title: string): HTMLElement => {
  const heading = screen.getByRole("heading", { name: title });
  const row = heading.closest("article");

  if (!row) throw new Error(`Trash row not found: ${title}`);

  return row;
};

describe("TrashPage", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    restoreMock.mockClear();
    permanentlyDeleteMock.mockClear();
    emptyMock.mockClear();
    trashState.status = "ready";
    trashState.errorMessage = null;
    trashState.items = {
      folders: [{ id: "folder-1", folderName: "削除済みフォルダ" }],
      cardSets: [{ id: "card-set-1", name: "削除済みカードセット" }],
      cards: [{ id: "card-1", title: "削除済みカード" }],
      documents: [{ id: "document-1", title: "削除済みPDF", fileName: "deleted.pdf" }],
    };
  });

  it("renders folders, card sets, cards, and documents", () => {
    render(<TrashPage />);

    expect(screen.getByText("削除済みフォルダ")).toBeInTheDocument();
    expect(screen.getByText("削除済みカードセット")).toBeInTheDocument();
    expect(screen.getByText("削除済みカード")).toBeInTheDocument();
    expect(screen.getByText("削除済みPDF")).toBeInTheDocument();
    expect(screen.getByText("フォルダ")).toBeInTheDocument();
    expect(screen.getByText("カードセット")).toBeInTheDocument();
    expect(screen.getByText("カード")).toBeInTheDocument();
    expect(screen.getByText("ドキュメント")).toBeInTheDocument();
  });

  it("passes the matching id bucket when permanently deleting each row", async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    await user.click(within(getRow("削除済みフォルダ")).getByRole("button", { name: "完全削除" }));
    await user.click(within(getRow("削除済みカードセット")).getByRole("button", { name: "完全削除" }));
    await user.click(within(getRow("削除済みカード")).getByRole("button", { name: "完全削除" }));
    await user.click(within(getRow("削除済みPDF")).getByRole("button", { name: "完全削除" }));

    expect(permanentlyDeleteMock).toHaveBeenNthCalledWith(1, { folderIds: ["folder-1"], cardIds: [], cardSetIds: [], documentIds: [] });
    expect(permanentlyDeleteMock).toHaveBeenNthCalledWith(2, { folderIds: [], cardIds: [], cardSetIds: ["card-set-1"], documentIds: [] });
    expect(permanentlyDeleteMock).toHaveBeenNthCalledWith(3, { folderIds: [], cardIds: ["card-1"], cardSetIds: [], documentIds: [] });
    expect(permanentlyDeleteMock).toHaveBeenNthCalledWith(4, { folderIds: [], cardIds: [], cardSetIds: [], documentIds: ["document-1"] });
  });

  it("passes the matching id bucket when restoring each row", async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    await user.click(within(getRow("削除済みフォルダ")).getByRole("button", { name: "復元" }));
    await user.click(within(getRow("削除済みカードセット")).getByRole("button", { name: "復元" }));
    await user.click(within(getRow("削除済みカード")).getByRole("button", { name: "復元" }));
    await user.click(within(getRow("削除済みPDF")).getByRole("button", { name: "復元" }));

    expect(restoreMock).toHaveBeenNthCalledWith(1, { folderIds: ["folder-1"], cardIds: [], cardSetIds: [], documentIds: [] });
    expect(restoreMock).toHaveBeenNthCalledWith(2, { folderIds: [], cardIds: [], cardSetIds: ["card-set-1"], documentIds: [] });
    expect(restoreMock).toHaveBeenNthCalledWith(3, { folderIds: [], cardIds: ["card-1"], cardSetIds: [], documentIds: [] });
    expect(restoreMock).toHaveBeenNthCalledWith(4, { folderIds: [], cardIds: [], cardSetIds: [], documentIds: ["document-1"] });
  });

  it("empties all trash through the hook action", async () => {
    const user = userEvent.setup();
    render(<TrashPage />);

    await user.click(screen.getByRole("button", { name: "ゴミ箱を空にする" }));

    expect(emptyMock).toHaveBeenCalledTimes(1);
  });
});
