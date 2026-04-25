import { describe, expect, it } from "vitest";

import {
  MF_CARD_FORMAT,
  MF_CARD_VERSION,
  MfCardValidationError,
  type MfCardFileV1,
} from "@/features/cardFile/domain/mfCardTypes";
import {
  decodeMfCardFile,
  encodeMfCardFile,
} from "@/features/cardFile/infra/web/mfCardJsonCodec";

const createCardFile = (): MfCardFileV1 => ({
  format: MF_CARD_FORMAT,
  version: MF_CARD_VERSION,
  exportedAt: "2026-01-01T00:00:00.000Z",
  app: {
    name: "Manifolia",
    version: "0.0.0-test",
  },
  card: {
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
});

describe("mfCardJsonCodec", () => {
  it("mfcard v1 をJSONとして往復できる", () => {
    const bytes = encodeMfCardFile(createCardFile());
    const decoded = decodeMfCardFile(
      bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer,
    );

    expect(decoded.card.title).toBe("カードA");
    expect(decoded.card.front.blocks).toHaveLength(1);
  });

  it("mfcard v1 ではないJSONを拒否する", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({
        format: "manifolia.card",
        version: 999,
      }),
    );

    expect(() =>
      decodeMfCardFile(
        bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        ) as ArrayBuffer,
      ),
    ).toThrow(MfCardValidationError);
  });
});
