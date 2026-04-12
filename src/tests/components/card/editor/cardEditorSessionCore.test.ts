// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  createPanelCard,
  draftSignature,
  extractCreatedCardId,
  hasMeaningfulDraft,
} from "@/components/card/editor/cardEditorSessionCore";

describe("cardEditorSessionCore", () => {
  it("detects meaningful draft without React state", () => {
    const emptyDraft = {
      title: "",
      tags: [],
      isDraft: false,
      frontBlocks: [],
      backBlocks: [],
      frontAttachments: { images: [], audios: [], references: [] },
      backAttachments: { images: [], audios: [], references: [] },
      layoutRows: 12,
    };

    const meaningfulDraft = {
      ...emptyDraft,
      frontBlocks: [
        {
          id: "b1",
          type: "text",
          content: "hello",
          orderIndex: 0,
        },
      ],
    };

    expect(hasMeaningfulDraft(emptyDraft as never)).toBe(false);
    expect(hasMeaningfulDraft(meaningfulDraft as never)).toBe(true);
  });

  it("extracts created card id from multiple payload shapes", () => {
    expect(extractCreatedCardId("card-1")).toBe("card-1");
    expect(extractCreatedCardId({ id: "card-2" })).toBe("card-2");
    expect(extractCreatedCardId({ cardId: "card-3" })).toBe("card-3");
    expect(extractCreatedCardId({})).toBeNull();
  });

  it("creates stable draft signature", () => {
    const draft = {
      title: "title",
      tags: ["tag-a"],
      isDraft: true,
      frontBlocks: [],
      backBlocks: [],
      frontAttachments: { images: [], audios: [], references: [] },
      backAttachments: { images: [], audios: [], references: [] },
      layoutRows: 20,
    };

    expect(draftSignature(draft as never)).toBe(
      draftSignature({ ...draft } as never),
    );
  });

  it("creates panel card from draft without React component state", () => {
    const draft = {
      title: "draft title",
      tags: ["a"],
      isDraft: true,
      frontBlocks: [],
      backBlocks: [],
      frontAttachments: { images: [], audios: [], references: [] },
      backAttachments: { images: [], audios: [], references: [] },
      layoutRows: 18,
    };

    const panelCard = createPanelCard({
      selectedCard: null,
      draft: draft as never,
      isEditing: true,
    });

    expect(panelCard?.title).toBe("draft title");
    expect(panelCard?.isDraft).toBe(true);
    expect((panelCard as { layoutRows?: number } | null)?.layoutRows).toBe(18);
  });
});
