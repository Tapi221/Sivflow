// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCardSetViewActions } from "@/features/cardsetview/presentation/web/hooks/useCardSetViewActions";
import type { Card } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

const {
  createAndFocusCardUseCaseMock,
  toggleCardBookmarkMock,
  toggleCardUncertaintyMock,
  resolveCardMutationTargetMock,
} = vi.hoisted(() => ({
  createAndFocusCardUseCaseMock: vi.fn(),
  toggleCardBookmarkMock: vi.fn(),
  toggleCardUncertaintyMock: vi.fn(),
  resolveCardMutationTargetMock: vi.fn(),
}));

vi.mock("@/features/cardsetview/application/cardSetViewUseCases", () => ({
  createAndFocusCard: createAndFocusCardUseCaseMock,
  toggleCardBookmark: toggleCardBookmarkMock,
  toggleCardUncertainty: toggleCardUncertaintyMock,
}));

vi.mock("@/features/cardsetview/application/cardSetViewMutationTarget", () => ({
  resolveCardMutationTarget: resolveCardMutationTargetMock,
}));

const makeCardSet = (overrides: Partial<CardSet> = {}) =>
  ({
    id: "set-1",
    userId: "user-1",
    deviceId: "web",
    folderId: "folder-1",
    name: "テストセット",
    orderIndex: 0,
    isDeleted: false,
    createdAt: new Date("2026-04-19T00:00:00.000Z"),
    updatedAt: new Date("2026-04-19T00:00:00.000Z"),
    ...overrides,
  }) as CardSet;

describe("useCardSetViewActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mount だけではカードを永続化しない", () => {
    const createCard = vi.fn();

    renderHook(() =>
      useCardSetViewActions({
        cardSetId: "set-1",
        cardSetById: new Map([
          ["set-1", { id: "set-1", folderId: "folder-1" }],
        ]),
        selectedCardSet: makeCardSet(),
        selectedCard: null,
        currentCard: null,
        createCard,
        updateCard: vi.fn(),
        toastError: vi.fn(),
        beginGlobalEditing: vi.fn(),
        setPendingFocusCardId: vi.fn(),
        clearFlippedCards: vi.fn(),
      }),
    );

    expect(createCard).not.toHaveBeenCalled();
    expect(createAndFocusCardUseCaseMock).not.toHaveBeenCalled();
  });

  it("明示操作のときだけ createAndFocusCard を通してカードを生成する", async () => {
    const createCard = vi.fn();
    const updateCard = vi.fn();
    const toastError = vi.fn();
    const beginGlobalEditing = vi.fn();
    const setPendingFocusCardId = vi.fn();
    const clearFlippedCards = vi.fn();

    resolveCardMutationTargetMock.mockReturnValue({
      targetCardSetId: "set-1",
      targetFolderId: "folder-1",
    });
    createAndFocusCardUseCaseMock.mockResolvedValue("card-99");

    const { result } = renderHook(() =>
      useCardSetViewActions({
        cardSetId: "set-1",
        cardSetById: new Map([
          ["set-1", { id: "set-1", folderId: "folder-1" }],
        ]),
        selectedCardSet: makeCardSet(),
        selectedCard: null,
        currentCard: null,
        createCard,
        updateCard,
        toastError,
        beginGlobalEditing,
        setPendingFocusCardId,
        clearFlippedCards,
      }),
    );

    await act(async () => {
      await expect(result.current.createAndFocusCard()).resolves.toBe(true);
    });

    expect(resolveCardMutationTargetMock).toHaveBeenCalledWith({
      cardSetId: "set-1",
      cardSetById: new Map([["set-1", { id: "set-1", folderId: "folder-1" }]]),
      selectedCardSet: expect.objectContaining({ id: "set-1" }),
      selectedCard: null,
      currentCard: null,
    });
    expect(clearFlippedCards).toHaveBeenCalledTimes(1);
    expect(beginGlobalEditing).toHaveBeenCalledTimes(1);
    expect(createAndFocusCardUseCaseMock).toHaveBeenCalledWith({
      targetCardSetId: "set-1",
      targetFolderId: "folder-1",
      createCard,
    });
    expect(setPendingFocusCardId).toHaveBeenCalledWith("card-99");
    expect(toastError).not.toHaveBeenCalled();
  });

  it("トグル操作は既存 use case に委譲する", async () => {
    const card = {
      id: "card-1",
      hasUncertainty: false,
      isBookmarked: false,
    } as Card;
    const updateCard = vi.fn();

    const { result } = renderHook(() =>
      useCardSetViewActions({
        cardSetId: "set-1",
        cardSetById: new Map(),
        selectedCardSet: makeCardSet(),
        selectedCard: null,
        currentCard: null,
        createCard: vi.fn(),
        updateCard,
        toastError: vi.fn(),
        beginGlobalEditing: vi.fn(),
        setPendingFocusCardId: vi.fn(),
        clearFlippedCards: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleToggleUncertainty(card);
      await result.current.handleToggleBookmark(card);
    });

    expect(toggleCardUncertaintyMock).toHaveBeenCalledWith({
      card,
      updateCard,
    });
    expect(toggleCardBookmarkMock).toHaveBeenCalledWith({ card, updateCard });
  });
});
