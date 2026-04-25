import { describe, expect, it } from "vitest";

import {
  MF_DECK_FORMAT,
  MF_DECK_VERSION,
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
      mediaBundled: false,
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
              type: "text",
              orderIndex: 0,
              content: "表面",
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
});

describe("mfDeckZipCodec", () => {
  it("manifest.json と cards.json を含む mfdeck を往復できる", () => {
    const archive = createArchive();
    const bytes = encodeMfDeckArchive(archive);
    const decoded = decodeMfDeckArchive(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );

    expect(decoded.manifest.deck.name).toBe("テストデッキ");
    expect(decoded.cardsJson.cards).toHaveLength(1);
    expect(decoded.cardsJson.cards[0]?.front.blocks[0]?.content).toBe("表面");
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

    const bytes = encodeMfDeckArchive(invalidArchive);

    expect(() =>
      decodeMfDeckArchive(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
      ),
    ).toThrow(MfDeckValidationError);
  });
});
