// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import type { Card, CardSet } from "@/types";
import type { FolderTreeNode } from "@/components/folder/explorer/model/utils";

const buildFolder = (id: string, parentFolderId: string | null = null) =>
  ({
    id,
    parentFolderId,
    folderName: id,
    orderIndex: 0,
    isDeleted: false,
  }) as FolderTreeNode;

const buildCard = (
  id: string,
  cardSetId: string,
  folderId: string,
  orderIndex = 0,
) =>
  ({
    id,
    cardSetId,
    folderId,
    orderIndex,
    isDeleted: false,
  }) as Card;

const buildCardSet = (id: string, folderId: string) =>
  ({
    id,
    folderId,
    name: id,
    orderIndex: 0,
    isDeleted: false,
  }) as CardSet;

describe("useExplorerDerivedData", () => {
  it("folder item 集計は CardSet.folderId を使い、missing cardSetId は除外する", () => {
    const { result } = renderHook(() =>
      useExplorerDerivedData({
        treeFolders: [buildFolder("folder-a"), buildFolder("folder-b")],
        treeCards: [
          buildCard("card-1", "set-1", "legacy-folder"),
          buildCard("card-2", "set-missing", "folder-a"),
          buildCard("card-3", "set-2", "folder-b"),
        ],
        cardSets: [
          buildCardSet("set-1", "folder-a"),
          buildCardSet("set-2", "folder-b"),
        ],
        documents: [],
        isFiltering: false,
      }),
    );

    expect(result.current.directCardCountByFolderId.get("folder-a")).toBe(1);
    expect(result.current.directCardCountByFolderId.get("folder-b")).toBe(1);
    expect(result.current.directCardCountByFolderId.get("")).toBeUndefined();
    expect(result.current.getNextOrderIndex("folder-a")).toBe(1);
  });

  it("moveCardSetToFolder 後は card.folderId が古くても表示先フォルダが追従する", () => {
    const baseCards = [buildCard("card-1", "set-1", "legacy-folder", 7)];
    const folders = [buildFolder("folder-a"), buildFolder("folder-b")];
    const { result, rerender } = renderHook(
      ({ cardSets }: { cardSets: CardSet[] }) =>
        useExplorerDerivedData({
          treeFolders: folders,
          treeCards: baseCards,
          cardSets,
          documents: [],
          isFiltering: false,
        }),
      {
        initialProps: {
          cardSets: [buildCardSet("set-1", "folder-a")],
        },
      },
    );

    expect(result.current.directCardCountByFolderId.get("folder-a")).toBe(1);
    expect(result.current.directCardCountByFolderId.get("folder-b")).toBeUndefined();

    rerender({
      cardSets: [buildCardSet("set-1", "folder-b")],
    });

    expect(result.current.directCardCountByFolderId.get("folder-a")).toBeUndefined();
    expect(result.current.directCardCountByFolderId.get("folder-b")).toBe(1);
  });

  it("カードを別 CardSet へ移すと Explorer の所属フォルダ集計が追従する", () => {
    const folders = [buildFolder("folder-a"), buildFolder("folder-b")];
    const cardSets = [buildCardSet("set-1", "folder-a"), buildCardSet("set-2", "folder-b")];
    const { result, rerender } = renderHook(
      ({ cards }: { cards: Card[] }) =>
        useExplorerDerivedData({
          treeFolders: folders,
          treeCards: cards,
          cardSets,
          documents: [],
          isFiltering: false,
        }),
      {
        initialProps: {
          cards: [buildCard("card-1", "set-1", "stale-folder-x", 0)],
        },
      },
    );

    expect(result.current.directCardCountByFolderId.get("folder-a")).toBe(1);
    expect(result.current.directCardCountByFolderId.get("folder-b")).toBeUndefined();

    rerender({
      cards: [buildCard("card-1", "set-2", "stale-folder-a", 0)],
    });

    expect(result.current.directCardCountByFolderId.get("folder-a")).toBeUndefined();
    expect(result.current.directCardCountByFolderId.get("folder-b")).toBe(1);
  });
});
