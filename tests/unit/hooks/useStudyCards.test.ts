// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useStudyCards } from "@/hooks/study/useStudyCards";
import type { Card, CardSet, Folder } from "@/types";

const buildCard = (
  id: string,
  cardSetId: string,
  folderId: string,
  nextReviewDate: Date,
) =>
  ({
    id,
    cardSetId,
    folderId,
    nextReviewDate,
    isDraft: false,
    isDeleted: false,
    orderIndex: 0,
  }) as Card;

const buildCardSet = (id: string, folderId: string) =>
  ({
    id,
    folderId,
    name: id,
    orderIndex: 0,
    isDeleted: false,
  }) as CardSet;

const buildFolder = (id: string) =>
  ({
    id,
    folderName: id,
    isDeleted: false,
  }) as Folder;

describe("useStudyCards", () => {
  it("folder 絞り込みは CardSet.folderId ベースで、missing cardSetId は除外する", () => {
    const today = new Date();
    const { result } = renderHook(() =>
      useStudyCards({
        folderId: "folder-a",
        allCards: [
          buildCard("card-1", "set-1", "legacy-folder", today),
          buildCard("card-2", "set-missing", "folder-a", today),
          buildCard("card-3", "set-2", "folder-b", today),
        ],
        cardSets: [
          buildCardSet("set-1", "folder-a"),
          buildCardSet("set-2", "folder-b"),
        ],
        folders: [buildFolder("folder-a"), buildFolder("folder-b")],
        foldersLoading: false,
        settings: { autoCarryOver: true },
      }),
    );

    expect(result.current.studyCards.map((card) => card.id)).toEqual([
      "card-1",
    ]);
  });

  it("moveCardToSet 後は Study 側の所属フォルダが CardSet 変更に追従する", () => {
    const today = new Date();
    const allCards = [buildCard("card-1", "set-1", "legacy-folder", today)];
    const cardSets = [
      buildCardSet("set-1", "folder-a"),
      buildCardSet("set-2", "folder-b"),
    ];

    const { result, rerender } = renderHook(
      ({ cards }: { cards: Card[] }) =>
        useStudyCards({
          folderId: "folder-b",
          allCards: cards,
          cardSets,
          folders: [buildFolder("folder-a"), buildFolder("folder-b")],
          foldersLoading: false,
          settings: { autoCarryOver: true },
        }),
      {
        initialProps: { cards: allCards },
      },
    );

    expect(result.current.studyCards).toHaveLength(0);

    rerender({
      cards: [
        {
          ...allCards[0],
          cardSetId: "set-2",
          folderId: "stale-folder-a",
        } as Card,
      ],
    });

    expect(result.current.studyCards.map((card) => card.id)).toEqual([
      "card-1",
    ]);
  });
});
