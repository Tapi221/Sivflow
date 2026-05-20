// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCardSets } from "@/hooks/cardSet/useCardSets";

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

describe("useCardSets", () => {
  beforeEach(() => {
    useLiveQueryMock.mockImplementation((queryFn: () => unknown) => {
      if (typeof queryFn !== "function") return [];
      return [];
    });
    getLocalDbMock.mockReset();
  });

  it("moveCardSetToFolder は card.folderId を更新しない", async () => {
    useLiveQueryMock.mockImplementation(
      (_queryFn: () => unknown, _deps: unknown) => [
        { id: "set-1", folderId: "folder-a", orderIndex: 0, isDeleted: false },
      ],
    );

    const updateCardSet = vi.fn(async () => 1);
    const cardsWhere = vi.fn();
    getLocalDbMock.mockResolvedValue({
      cardSets: {
        update: updateCardSet,
      },
      cards: {
        where: cardsWhere,
      },
    });

    const { result } = renderHook(() => useCardSets());

    await act(async () => {
      await result.current.moveCardSetToFolder("set-1", "folder-b");
    });

    expect(updateCardSet).toHaveBeenCalledWith(
      "set-1",
      expect.objectContaining({
        folderId: "folder-b",
      }),
    );
    expect(cardsWhere).not.toHaveBeenCalled();
  });
});
