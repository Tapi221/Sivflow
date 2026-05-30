import { describe, expect, it, vi } from "vitest";
import { importMfCardFile } from "@/features/cardFile/application/importMfCard";
import { MF_CARD_FORMAT, MF_CARD_VERSION, type MfCardFileV1 } from "@/features/cardFile/domain/mfCard.types";
import type { Card, CardSet } from "@/types";

const createCardFile = (): MfCardFileV1 => ({
  format: MF_CARD_FORMAT,
  version: MF_CARD_VERSION,
  exportedAt: "2026-01-01T00:00:00.000Z",
  app: {
    name: "Sivflow",
  },
  card: {
    id: "source-card",
    sourceCardId: "source-card",
    questionNumber: "Q7",
    title: "単体カード",
    orderIndex: 12,
    tagNames: ["数学", "数学", "確率"],
    front: {
      blocks: [
        {
          id: "front-block",
          type: "text",
          orderIndex: 0,
          content: "表面",
        },
      ],
    },
    back: {
      blocks: [
        {
          id: "back-block",
          type: "markdown",
          orderIndex: 0,
          markdown: "裏面",
        },
      ],
    },
  },
});

describe("importMfCardFile", () => {
  it("mfcard を1枚のカードとして新規カードセットに取り込む", async () => {
    const createCardSet = vi.fn(
      async (name: string, folderId?: string | null) =>
        ({
          id: "created-set",
          name,
          folderId: folderId ?? null,
        }) as CardSet,
    );
    const createCard = vi.fn(
      async (cardData: Partial<Card> & { cardSetId?: string }) =>
        ({ id: crypto.randomUUID(), ...cardData }) as Card,
    );
    const ensureTagByName = vi.fn(async (name: string) => `tag-${name}`);

    const result = await importMfCardFile({
      cardFile: createCardFile(),
      folderId: "folder-001",
      createCardSet,
      createCard,
      ensureTagByName,
      destination: {
        kind: "new-card-set",
        cardSetName: "取り込みカード",
      },
    });

    expect(createCardSet).toHaveBeenCalledWith(
      "取り込みカード",
      "folder-001",
      expect.any(Object),
    );
    expect(createCard).toHaveBeenCalledTimes(1);
    expect(createCard.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        folderId: "folder-001",
        cardSetId: "created-set",
        title: "単体カード",
        tagIds: ["tag-数学", "tag-確率"],
      }),
    );
    expect(result.createdCount).toBe(1);
  });
});
