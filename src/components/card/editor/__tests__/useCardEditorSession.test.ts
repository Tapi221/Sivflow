// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useCardEditorSession } from "@/components/card/editor/useCardEditorSession";
import type { Card } from "@/types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    title: "old-title",
    isDraft: false,
    tagIds: [],
    questionImages: [],
    answerImages: [],
    frontBlocks: [],
    backBlocks: [],
    layoutRows: 16,
    ...overrides,
  } as Card;
}

describe("useCardEditorSession", () => {
  it("saves latest title even when save is triggered immediately after input", async () => {
    const updateCard = vi.fn().mockResolvedValue(undefined);
    const addTag = vi.fn(async (name: string) => ({ id: `tag-${name}` }));
    const card = makeCard();

    const { result } = renderHook(() =>
      useCardEditorSession({
        selectedCardId: card.id,
        autoEdit: true,
        folderId: "folder-1",
        cards: [card],
        updateCard,
        createCard: vi.fn(),
        addTag,
        tagById: new Map<string, unknown>(),
        resetDialogs: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draft).not.toBeNull();
    });

    await act(async () => {
      result.current.handleTitleInputChange("new-title");
      const saved = await result.current.handleSave();
      expect(saved).toBe(true);
    });

    expect(updateCard).toHaveBeenCalledWith(
      card.id,
      expect.objectContaining({ title: "new-title" }),
    );
  });

  it("keeps editing after save when autoEdit is enabled", async () => {
    const updateCard = vi.fn().mockResolvedValue(undefined);
    const addTag = vi.fn(async (name: string) => ({ id: `tag-${name}` }));
    const card = makeCard();

    const { result } = renderHook(() =>
      useCardEditorSession({
        selectedCardId: card.id,
        autoEdit: true,
        folderId: "folder-1",
        cards: [card],
        updateCard,
        createCard: vi.fn(),
        addTag,
        tagById: new Map<string, unknown>(),
        resetDialogs: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draft).not.toBeNull();
    });

    await act(async () => {
      const saved = await result.current.handleSave();
      expect(saved).toBe(true);
    });

    expect(result.current.isEditing).toBe(true);
  });

  it("exits editing after save when autoEdit is disabled", async () => {
    const updateCard = vi.fn().mockResolvedValue(undefined);
    const addTag = vi.fn(async (name: string) => ({ id: `tag-${name}` }));
    const card = makeCard();

    const { result } = renderHook(() =>
      useCardEditorSession({
        selectedCardId: card.id,
        autoEdit: false,
        folderId: "folder-1",
        cards: [card],
        updateCard,
        createCard: vi.fn(),
        addTag,
        tagById: new Map<string, unknown>(),
        resetDialogs: vi.fn(),
      }),
    );

    await waitFor(() => {
      expect(result.current.isEditing).toBe(false);
    });

    await act(async () => {
      result.current.setIsEditing(true);
    });

    await waitFor(() => {
      expect(result.current.isEditing).toBe(true);
      expect(result.current.draft).not.toBeNull();
    });

    await act(async () => {
      const saved = await result.current.handleSave();
      expect(saved).toBe(true);
    });

    expect(result.current.isEditing).toBe(false);
  });
});





