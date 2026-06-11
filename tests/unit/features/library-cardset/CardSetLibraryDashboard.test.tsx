// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CardSetLibraryDashboard } from "@/features/library-cardset/components/CardSetLibraryDashboard";
import type { Card, CardSet, Folder } from "@/types";

type ToolbarProps = {
  activeSection: string;
};

vi.mock("@/features/library-pdf/components/PdfLibraryWorkspaceToolbar", () => ({
  PdfLibraryWorkspaceToolbar: ({ activeSection }: ToolbarProps) => <div data-testid="library-toolbar">{activeSection}</div>,
}));

vi.mock("@/features/settings/hooks/useTags", () => ({
  useTags: () => ({ tagById: new Map([["tag-1", { name: "英語" }]]) }),
}));

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const updatedAt = new Date("2026-01-02T00:00:00.000Z");

const createFolder = (): Folder => ({
  id: "folder-1",
  userId: "user-1",
  deviceId: "device-1",
  createdAt,
  updatedAt,
  isDeleted: false,
  folderId: "folder-1",
  folderName: "英語",
  cloudSyncEnabled: false,
});

const createCardSet = (): CardSet => ({
  id: "set-1",
  userId: "user-1",
  deviceId: "device-1",
  createdAt,
  updatedAt,
  isDeleted: false,
  folderId: "folder-1",
  name: "単語セット",
  description: "毎日確認する単語",
  orderIndex: 0,
  tags: ["tag-1"],
});

const createCard = (): Card => ({
  id: "card-1",
  userId: "user-1",
  deviceId: "device-1",
  createdAt,
  updatedAt,
  isDeleted: false,
  cardSetId: "set-1",
  orderIndex: 0,
  questionNumber: "1",
  front: { blocks: [] },
  back: { blocks: [] },
  isDraft: false,
  hasUncertainty: false,
  isCompleted: false,
  isSilent: false,
  memoryStability: 0,
  nextReviewDate: null,
});

describe("CardSetLibraryDashboard", () => {
  it("カードセット一覧を表示し、選択したカードセットを開く", () => {
    const onOpenCardSet = vi.fn();

    render(
      <CardSetLibraryDashboard
        cards={[createCard()]}
        cardSets={[createCardSet()]}
        folders={[createFolder()]}
        onOpenCardSet={onOpenCardSet}
      />,
    );

    expect(screen.getByTestId("library-toolbar")).toHaveTextContent("flashcard");
    expect(screen.getByText("単語セット")).toBeTruthy();
    expect(screen.getByText("毎日確認する単語")).toBeTruthy();
    expect(screen.getByText("英語")).toBeTruthy();
    expect(screen.getByText("1枚")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "単語セットを開く" }));

    expect(onOpenCardSet).toHaveBeenCalledWith("set-1");
  });

  it("未削除のカードセットがない場合は空状態を表示する", () => {
    render(
      <CardSetLibraryDashboard
        cards={[]}
        cardSets={[]}
        folders={[createFolder()]}
        onOpenCardSet={() => undefined}
      />,
    );

    expect(screen.getByText("カードセットがありません")).toBeTruthy();
  });
});
