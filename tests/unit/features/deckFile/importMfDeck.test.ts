import { describe, expect, it, vi } from "vitest";

import { importMfDeckArchive } from "@/features/deckFile/application/importMfDeck";
import {
  MF_DECK_FORMAT,
  MF_DECK_MEDIA_URI_PREFIX,
  MF_DECK_VERSION,
  type MfDeckArchiveV1,
} from "@/features/deckFile/domain/mfDeckTypes";
import type { Card, CardSet } from "@/types";

const createArchive = (): MfDeckArchiveV1 => ({
  manifest: {
    format: MF_DECK_FORMAT,
    version: MF_DECK_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    app: {
      name: "Manifolia",
    },
    deck: {
      id: "source-deck",
      name: "共有デッキ",
      description: "共有用",
      cardCount: 1,
      defaultDisplayMode: "fluid",
    },
    capabilities: {
      mediaBundled: true,
      tagNames: true,
      reviewProgressIncluded: false,
    },
  },
  cardsJson: {
    format: "manifolia.deck.cards",
    version: MF_DECK_VERSION,
    cards: [
      {
        id: "source-card",
        sourceCardId: "source-card",
        questionNumber: "Q7",
        title: "カードタイトル",
        orderIndex: 10,
        tagNames: ["数学", "数学", "確率"],
        front: {
          blocks: [
            {
              id: "front-block",
              type: "image",
              orderIndex: 0,
              images: [
                {
                  id: "image-001",
                  status: "ready",
                  localUrl: `${MF_DECK_MEDIA_URI_PREFIX}media/images/0001-image.png` as never,
                },
              ],
            },
          ],
          extraRows: 1,
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
          extraRows: 2,
        },
        flags: {
          isDraft: false,
          isSilent: true,
          isBookmarked: true,
          hasUncertainty: true,
        },
      },
    ],
  },
  mediaManifest: {
    format: "manifolia.deck.media",
    version: MF_DECK_VERSION,
    media: [
      {
        path: "media/images/0001-image.png",
        kind: "image",
        mimeType: "image/png",
        sizeBytes: 4,
      },
    ],
  },
  media: {
    "media/images/0001-image.png": new Uint8Array([137, 80, 78, 71]),
  },
});

describe("importMfDeckArchive", () => {
  it("新規カードセットを作成し、カードID/ブロックIDを再採番してメディアを復元する", async () => {
    const createCardSet = vi.fn(
      async (name: string, folderId?: string | null) =>
        ({
          id: "created-set",
          name,
          folderId: folderId ?? null,
        }) as CardSet,
    );
    const updateCardSet = vi.fn(async () => {});
    const createCard = vi.fn(
      async (cardData: Partial<Card> & { cardSetId?: string }) =>
        ({ id: "created-card", ...cardData }) as Card,
    );
    const ensureTagByName = vi.fn(async (name: string) => `tag-${name}`);

    const result = await importMfDeckArchive({
      archive: createArchive(),
      folderId: "folder-001",
      createCardSet,
      updateCardSet,
      createCard,
      ensureTagByName,
      destination: {
        kind: "new-card-set",
        cardSetName: "取り込み先",
      },
    });

    expect(createCardSet).toHaveBeenCalledWith("取り込み先", "folder-001", {
      description: "共有用",
    });
    expect(updateCardSet).toHaveBeenCalledWith("created-set", {
      defaultDisplayMode: "fluid",
    });
    expect(createCard).toHaveBeenCalledTimes(1);
    expect(createCard.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        folderId: "folder-001",
        cardSetId: "created-set",
        questionNumber: "Q7",
        title: "カードタイトル",
        isCompleted: false,
        hasUncertainty: false,
        tagIds: ["tag-数学", "tag-確率"],
      }),
    );

    const createdFrontBlock = createCard.mock.calls[0]?.[0].front?.blocks[0];
    expect(createdFrontBlock?.id).not.toBe("front-block");

    const restoredImage = (
      createdFrontBlock as unknown as {
        images?: Array<{ localUrl?: string }>;
      }
    )?.images?.[0];
    expect(restoredImage?.localUrl).toBe("data:image/png;base64,iVBORw==");
    expect(result.createdCount).toBe(1);
    expect(result.createdCardSetId).toBe("created-set");
  });
});
