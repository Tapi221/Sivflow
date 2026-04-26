import { describe, expect, it } from "vitest";

import {
  MF_DECK_FORMAT,
  MF_DECK_VERSION,
  MF_DECK_MEDIA_URI_PREFIX,
  MfDeckValidationError,
  type MfDeckArchiveV1,
} from "@/features/deckFile/domain/mfDeckTypes";
import {
  decodeMfDeckArchive,
  encodeMfDeckArchive,
} from "@/features/deckFile/infra/web/mfDeckZipCodec";

const createArchive = (): MfDeckArchiveV1 => ({
  manifest: {
    format: MF_DECK_FORMAT,
    version: MF_DECK_VERSION,
    exportedAt: "2026-01-01T00:00:00.000Z",
    app: {
      name: "Manifolia",
      version: "0.0.0-test",
    },
    deck: {
      id: "deck-001",
      name: "テストデッキ",
      cardCount: 1,
      defaultDisplayMode: "fixed",
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
        id: "card-001",
        sourceCardId: "card-001",
        questionNumber: "Q1",
        title: "カードA",
        orderIndex: 0,
        tagNames: ["数学"],
        front: {
          blocks: [
            {
              id: "block-front-001",
              type: "image",
              orderIndex: 0,
              images: [
                {
                  id: "image-001",
                  status: "ready",
                  localUrl:
                    `${MF_DECK_MEDIA_URI_PREFIX}media/images/0001-image.png` as never,
                },
              ],
            },
          ],
        },
        back: {
          blocks: [
            {
              id: "block-back-001",
              type: "markdown",
              orderIndex: 0,
              markdown: "裏面",
            },
          ],
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
        sourceName: "image.png",
      },
    ],
  },
  media: {
    "media/images/0001-image.png": new Uint8Array([137, 80, 78, 71]),
  },
});

const toArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
};

describe("mfDeckZipCodec", () => {
  it("manifest.json と cards.json と media を含む mfdeck を往復できる", () => {
    const archive = createArchive();
    const bytes = encodeMfDeckArchive(archive);
    const decoded = decodeMfDeckArchive(toArrayBuffer(bytes));

    expect(decoded.manifest.deck.name).toBe("テストデッキ");
    expect(decoded.cardsJson.cards).toHaveLength(1);
    expect(decoded.cardsJson.cards[0]?.front.blocks[0]?.type).toBe("image");
    expect(decoded.mediaManifest?.media[0]?.path).toBe(
      "media/images/0001-image.png",
    );
    expect(
      Array.from(decoded.media?.["media/images/0001-image.png"] ?? []),
    ).toEqual([137, 80, 78, 71]);
  });

  it("mfdeck v1 ではない manifest を拒否する", () => {
    const archive = createArchive();
    const invalidArchive = {
      ...archive,
      manifest: {
        ...archive.manifest,
        format: "unknown.deck",
      },
    } as unknown as MfDeckArchiveV1;

    expect(() => encodeMfDeckArchive(invalidArchive)).toThrow(
      MfDeckValidationError,
    );
  });

  it("重複した card id を拒否する", () => {
    const archive = createArchive();
    const duplicatedCard = {
      ...archive.cardsJson.cards[0],
      title: "重複カード",
    };

    const invalidArchive = {
      ...archive,
      manifest: {
        ...archive.manifest,
        deck: {
          ...archive.manifest.deck,
          cardCount: 2,
        },
      },
      cardsJson: {
        ...archive.cardsJson,
        cards: [...archive.cardsJson.cards, duplicatedCard],
      },
    } satisfies MfDeckArchiveV1;

    expect(() => encodeMfDeckArchive(invalidArchive)).toThrow(
      MfDeckValidationError,
    );
  });
});
