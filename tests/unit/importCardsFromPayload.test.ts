import { describe, expect, it, vi } from "vitest";

import {
  buildImportCardSetName,
  importCardsFromPayload,
} from "@/features/import/importCardsFromPayload";
import type { ImportPayload } from "@/features/import/types";
import type { Card, CardSet } from "@/types";

type CreateCardInput = Partial<Card> & { cardSetId?: string };

describe("buildImportCardSetName", () => {
  it("xlsx 拡張子を除いた名前をベースにする", () => {
    const result = buildImportCardSetName("sample-import.xlsx");
    expect(result.startsWith("sample-import ")).toBe(true);
  });
});

describe("importCardsFromPayload", () => {
  const payload: ImportPayload = {
    version: 1,
    source: "xlsx",
    cards: [
      {
        cardId: "card-001",
        title: "カードA",
        frontBlocks: [
          {
            type: "text",
            order: 1,
            content: "本文A",
          },
        ],
        backBlocks: [
          {
            type: "markdown",
            order: 1,
            content: "## 回答A",
          },
        ],
      },
      {
        cardId: "card-002",
        title: "カードB",
        frontBlocks: [
          {
            type: "markdown",
            order: 1,
            content: "# 見出し",
          },
        ],
        backBlocks: [],
      },
    ],
  };

  it("新規カードセット作成時は指定名を優先して createCardSet を呼ぶ", async () => {
    const createCardSet = vi.fn(
      async (name: string) =>
        ({
          id: "set-new",
          name,
          folderId: "folder-001",
        }) as CardSet,
    );
    const createCard = vi.fn(
      async (cardData: CreateCardInput) =>
        ({ id: crypto.randomUUID(), ...cardData }) as Card,
    );

    const result = await importCardsFromPayload({
      payload,
      folderId: "folder-001",
      fileName: "ignored.xlsx",
      createCardSet,
      createCard,
      destination: {
        kind: "new-card-set",
        cardSetName: "明示セット名",
      },
    });

    expect(createCardSet).toHaveBeenCalledTimes(1);
    expect(createCardSet).toHaveBeenCalledWith("明示セット名", "folder-001");
    expect(createCard).toHaveBeenCalledTimes(2);
    expect(result.createdCardSetId).toBe("set-new");
    expect(result.createdCardSetName).toBe("明示セット名");
  });

  it("既存カードセット追加時は createCardSet を呼ばず cardSetId をそのまま使う", async () => {
    const createCardSet = vi.fn(
      async (name: string) =>
        ({
          id: "should-not-be-used",
          name,
          folderId: "folder-001",
        }) as CardSet,
    );
    const createCard = vi.fn(
      async (cardData: CreateCardInput) =>
        ({ id: crypto.randomUUID(), ...cardData }) as Card,
    );

    const result = await importCardsFromPayload({
      payload,
      folderId: "folder-001",
      fileName: "ignored.xlsx",
      createCardSet,
      createCard,
      destination: {
        kind: "existing-card-set",
        cardSetId: "set-existing",
        cardSetName: "既存セット",
      },
    });

    expect(createCardSet).not.toHaveBeenCalled();
    expect(createCard).toHaveBeenCalledTimes(2);
    expect(createCard.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        folderId: "folder-001",
        cardSetId: "set-existing",
        title: "カードA",
        front: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: "text" }),
          ]),
        }),
        back: expect.objectContaining({
          blocks: expect.arrayContaining([
            expect.objectContaining({ type: "markdown" }),
          ]),
        }),
      }),
    );
    expect(createCard.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        folderId: "folder-001",
        cardSetId: "set-existing",
        title: "カードB",
      }),
    );
    expect(result.createdCardSetId).toBe("set-existing");
    expect(result.createdCardSetName).toBe("既存セット");
  });

  it("作成されるカードの orderIndex は投入順に単調増加する", async () => {
    const createCardSet = vi.fn(
      async (name: string) =>
        ({ id: "set-new", name, folderId: "folder-001" }) as CardSet,
    );
    const createCard = vi.fn(
      async (cardData: CreateCardInput) =>
        ({ id: crypto.randomUUID(), ...cardData }) as Card,
    );

    await importCardsFromPayload({
      payload,
      folderId: "folder-001",
      fileName: "sample.xlsx",
      createCardSet,
      createCard,
      destination: { kind: "new-card-set", cardSetName: "sample" },
    });

    const firstOrder = createCard.mock.calls[0]?.[0]?.orderIndex as number;
    const secondOrder = createCard.mock.calls[1]?.[0]?.orderIndex as number;
    expect(secondOrder).toBeGreaterThan(firstOrder);
  });
});
