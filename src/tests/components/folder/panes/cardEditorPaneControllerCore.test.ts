// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import {
  applyEditingDraftPatch,
  buildCardsById,
  resolveSelectedCardSnapshot,
} from "@/components/folder/panes/cardEditorPaneControllerCore";

describe("cardEditorPaneControllerCore", () => {
  it("builds cardsById outside React", () => {
    const cards = [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ] as never[];

    const map = buildCardsById(cards);
    expect(map.get("a")?.title).toBe("A");
    expect(map.get("b")?.title).toBe("B");
  });

  it("resolves selected card snapshot from pure map", () => {
    const cards = [{ id: "a", title: "A" }] as never[];
    const cardsById = buildCardsById(cards);

    const selected = resolveSelectedCardSnapshot({
      selectedCardId: "a",
      cardsById,
    });

    expect(selected?.title).toBe("A");
  });

  it("applies draft patch only when editing current card", () => {
    const currentDraft = {
      title: "old",
      isDraft: false,
      tags: ["x"],
    };

    const next = applyEditingDraftPatch({
      currentDraft,
      detail: {
        cardId: "card-1",
        patch: {
          title: "new",
          isDraft: true,
          tags: ["a", "b"],
        },
      },
      selectedCardId: "card-1",
      isEditing: true,
    });

    expect(next).toEqual({
      title: "new",
      isDraft: true,
      tags: ["a", "b"],
    });
  });
});
