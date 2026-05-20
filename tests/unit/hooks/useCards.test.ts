// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCards } from "@/hooks/card/useCards";

const useLiveQueryMock = vi.fn();
const getLocalDbMock = vi.fn();

vi.mock("dexie-react-hooks", () => ({
  useLiveQuery: (...args: unknown[]) => useLiveQueryMock(...args),
}));

vi.mock("@/services/localDB", () => ({
  getLocalDb: (...args: unknown[]) => getLocalDbMock(...args),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuthSession: () => ({ currentUser: { uid: "user-1" } }),
}));

vi.mock("@/hooks/settings/useUserSettings", () => ({
  DEFAULT_SETTINGS: { reviewStartNextDay: true },
  useUserSettings: () => ({ settings: { reviewStartNextDay: true } }),
}));

const createWhereChain = (result: unknown) => ({
  equals: () => ({
    toArray: async () => result,
    count: async () => (Array.isArray(result) ? result.length : 0),
  }),
  anyOf: () => ({
    toArray: async () => result,
  }),
});

describe("useCards", () => {
  beforeEach(() => {
    useLiveQueryMock.mockImplementation(
      (_query: unknown, _deps: unknown, defaultValue?: unknown) =>
        defaultValue ?? [],
    );
    getLocalDbMock.mockReset();
  });

  it("createCard は cardSet 単位の questionNumber を採番する", async () => {
    const addItem = vi.fn(async () => undefined);
    getLocalDbMock.mockResolvedValue({
      cardSets: {
        get: async () => ({
          id: "set-1",
          folderId: "folder-a",
          isDeleted: false,
        }),
      },
      cards: {
        where: () =>
          createWhereChain([
            { id: "existing-card" },
            { id: "existing-card-2" },
          ]),
      },
      addItem,
    });

    const { result } = renderHook(() => useCards());

    await act(async () => {
      await result.current.createCard({
        cardSetId: "set-1",
        title: "new card",
      });
    });

    const payload = addItem.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(payload.cardSetId).toBe("set-1");
    expect(payload.folderId).toBeUndefined();
    expect(payload.questionNumber).toBe("Q3");
  });

  it("moveCardToSet は cardSetId/orderIndex を同期する", async () => {
    const updateItem = vi.fn(async () => undefined);
    getLocalDbMock.mockResolvedValue({
      cardSets: {
        get: async () => ({
          id: "set-2",
          folderId: "folder-b",
          isDeleted: false,
        }),
      },
      getAllCards: async () => [
        { id: "card-a", cardSetId: "set-2", orderIndex: 5, isDeleted: false },
      ],
      updateItem,
      cards: { where: () => createWhereChain([]) },
    });

    const { result } = renderHook(() => useCards());

    await act(async () => {
      await result.current.moveCardToSet("card-target", "set-2");
    });

    expect(updateItem).toHaveBeenCalledWith(
      "cards",
      "card-target",
      expect.objectContaining({
        cardSetId: "set-2",
        orderIndex: 6,
      }),
    );
  });

  it("reorderCardsInCardSet は CardSet スコープ外カードを reject する", async () => {
    getLocalDbMock.mockResolvedValue({
      cards: {
        bulkGet: async () => [
          { id: "card-1", cardSetId: "set-1" },
          { id: "card-2", cardSetId: "set-2" },
        ],
      },
      updateItem: vi.fn(async () => undefined),
    });

    const { result } = renderHook(() => useCards());

    await expect(
      result.current.reorderCardsInCardSet("set-1", ["card-1", "card-2"]),
    ).rejects.toThrow("CardSet スコープ外カードが混入しています");
  });

  it("updateCard は cardSetId / folderId の直接更新を reject する", async () => {
    const updateItem = vi.fn(async () => undefined);
    getLocalDbMock.mockResolvedValue({
      cards: {
        get: async () => ({
          id: "card-1",
          userId: "user-1",
          cardSetId: "set-1",
          folderId: "folder-a",
          front: { blocks: [] },
          back: { blocks: [] },
          orderIndex: 0,
          questionNumber: "Q1",
          isDraft: false,
          hasUncertainty: false,
          isCompleted: false,
          isSilent: false,
          memoryStability: 0,
          nextReviewDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      updateItem,
    });

    const { result } = renderHook(() => useCards());
    const unsafePatch = {
      cardSetId: "set-2",
    } as unknown as Parameters<typeof result.current.updateCard>[1];

    await expect(
      result.current.updateCard("card-1", unsafePatch),
    ).rejects.toThrow(
      "updateCard では cardSetId / folderId を直接更新できません。moveCardToSet を使用してください。",
    );
    expect(updateItem).not.toHaveBeenCalled();
  });
});
