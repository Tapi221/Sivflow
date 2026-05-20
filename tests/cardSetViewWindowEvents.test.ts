// @vitest-environment jsdom
import { CARD_SET_VIEW_EVENTS } from "@constants/shared/flashcard";
import { describe, expect, it, vi } from "vitest";

import {
  dispatchCardSetViewWindowEvent,
  subscribeCardSetViewWindowEvent,
} from "@/features/cardsetview/presentation/web/events/cardSetViewWindowEvents";

describe("cardSetViewWindowEvents", () => {
  it("dispatches and receives typed draft patch payload", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeCardSetViewWindowEvent(
      CARD_SET_VIEW_EVENTS.editingDraftPatch,
      listener,
    );

    dispatchCardSetViewWindowEvent(CARD_SET_VIEW_EVENTS.editingDraftPatch, {
      cardId: "card-1",
      patch: { title: "next", isDraft: true, tags: ["a"] },
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      cardId: "card-1",
      patch: { title: "next", isDraft: true, tags: ["a"] },
    });

    unsubscribe();
  });
});
