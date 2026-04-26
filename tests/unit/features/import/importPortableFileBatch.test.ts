import { describe, expect, it, vi } from "vitest";

import {
  buildPortableImportBatchItems,
  formatPortableImportBatchItemSubtitle,
  importPortableFileBatch,
} from "@/features/import/application/importPortableFileBatch";
import type { MfCardFileV1 } from "@/features/cardFile/domain/mfCardTypes";
import {
  MF_CARD_FORMAT,
  MF_CARD_VERSION,
} from "@/features/cardFile/domain/mfCardTypes";
import { encodeMfCardFile } from "@/features/cardFile/infra/web/mfCardJsonCodec";
import type { Card, CardSet } from "@/types";

const createMfCardFile = (): File => {
  const cardFile: MfCardFileV1 = {
    format: MF_CARD_FORMAT,
    version: MF_CARD_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    app: {
      name: "Manifolia",
      version: "test",
    },
    capabilities: {
      media: false,
      ink: false,
      tags: false,
    },
    card: {
      id: "card-source",
      sourceCardId: "card-source",
      questionNumber: "Q1",
      title: "単体カード",
      orderIndex: 0,
      front: {
        blocks: [
          {
            id: "block-front",
            type: "text",
            orderIndex: 0,
            content: "front",
          },
        ],
      },
      back: {
        blocks: [
          {
            id: "block-back",
            type: "text",
            orderIndex: 0,
            content: "back",
          },
        ],
      },
    },
  };

  return new File([encodeMfCardFile(cardFile)], "sample.mfcard", {
    type: "application/vnd.manifolia.card+json",
  });
};

describe("buildPortableImportBatchItems", () => {
  it("mfdeck/mfcard だけを重複除去してキュー化する", () => {
    const card = createMfCardFile();
    const xlsx = new File(["dummy"], "sample.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const items = buildPortableImportBatchItems([card, card, xlsx]);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        kind: "mfcard",
        name: "sample.mfcard",
        status: "queued",
      }),
    );
  });

  it("表示用サブタイトルを作る", () => {
    const [item] = buildPortableImportBatchItems([createMfCardFile()]);

    expect(formatPortableImportBatchItemSubtitle(item)).toMatch(/^MFCard \/ /);
  });
});

describe("importPortableFileBatch", () => {
  it("mfcard を新規カードセットとして一括インポートする", async () => {
    const createdCardSets: CardSet[] = [];
    const createdCards: Array<Partial<Card> & { cardSetId?: string }> = [];
    const onItemChange = vi.fn();

    const result = await importPortableFileBatch({
      files: [createMfCardFile()],
      folderId: "folder-001",
      createCardSet: async (name, folderId) => {
        const cardSet = {
          id: "set-001",
          name,
          folderId: folderId ?? null,
        } as CardSet;
        createdCardSets.push(cardSet);
        return cardSet;
      },
      createCard: async (cardData) => {
        createdCards.push(cardData);
        return { id: "card-created", ...cardData } as Card;
      },
      onItemChange,
    });

    expect(result.importedCount).toBe(1);
    expect(result.failedCount).toBe(0);
    expect(result.createdCardCount).toBe(1);
    expect(createdCardSets[0]).toEqual(
      expect.objectContaining({ name: "単体カード", folderId: "folder-001" }),
    );
    expect(createdCards[0]).toEqual(
      expect.objectContaining({ cardSetId: "set-001", title: "単体カード" }),
    );
    expect(onItemChange).toHaveBeenCalledWith(
      expect.objectContaining({ status: "imported", createdCount: 1 }),
    );
  });
});
