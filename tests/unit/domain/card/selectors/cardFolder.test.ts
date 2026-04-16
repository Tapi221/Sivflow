import {
  buildCardSetById,
  filterCardsByFolderId,
  isCardInFolder,
  resolveCardFolderId,
} from "@/domain/card/selectors/cardFolder";
import type { Card, CardSet } from "@/types";
import { describe, expect, it } from "vitest";

type CardLike = Pick<Card, "id" | "cardSetId" | "folderId">;
type CardSetLike = Pick<CardSet, "id" | "folderId">;

describe("cardFolder selectors", () => {
  it("resolveCardFolderId は CardSet.folderId を優先する", () => {
    const cardSets: CardSetLike[] = [{ id: "set-1", folderId: "folder-a" }];
    const card: CardLike = {
      id: "card-1",
      cardSetId: "set-1",
      folderId: "stale-folder",
    };

    const folderId = resolveCardFolderId(card, buildCardSetById(cardSets));

    expect(folderId).toBe("folder-a");
  });

  it("resolveCardFolderId は CardSet が解決できない場合だけ Card.folderId にフォールバックする", () => {
    const card: CardLike = {
      id: "card-legacy",
      cardSetId: "",
      folderId: "legacy-folder",
    };

    const folderId = resolveCardFolderId(card, buildCardSetById([]));

    expect(folderId).toBe("legacy-folder");
  });

  it("filterCardsByFolderId は CardSet ベースでカードを絞り込む", () => {
    const cardSets: CardSetLike[] = [
      { id: "set-1", folderId: "folder-a" },
      { id: "set-2", folderId: "folder-b" },
    ];
    const cardSetById = buildCardSetById(cardSets);
    const cards: CardLike[] = [
      { id: "card-1", cardSetId: "set-1", folderId: "legacy-x" },
      { id: "card-2", cardSetId: "set-2", folderId: "folder-a" },
      { id: "card-3", cardSetId: "", folderId: "folder-a" },
    ];

    const inFolderA = filterCardsByFolderId(cards, "folder-a", cardSetById);

    expect(inFolderA.map((card) => card.id)).toEqual(["card-1", "card-3"]);
    expect(isCardInFolder(cards[1], "folder-a", cardSetById)).toBe(false);
  });
});
