// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STORAGE_KEY = "explorer-storage";

const flushHydration = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("useExplorerStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("hydrates filter state while dropping legacy history and tab state", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          activeTab: "recent",
          explorerTab: "recent",
          recent: [
            {
              type: "folder",
              id: "folder-1",
              ts: 1_734_897_600_000,
            },
          ],
          tagFilter: ["数学"],
          tagMatchMode: "all",
          uncertaintyFilter: "on",
          bookmarkedFilter: "off",
          draftFilter: "on",
          contentTypeFilter: ["card"],
          directoryBadgeVisibility: {
            uncertainty: false,
            bookmarked: true,
            tags: false,
          },
        },
        version: 0,
      }),
    );

    const { useExplorerStore } = await import("@/hooks/folder/useExplorerStore");
    await flushHydration();

    const state = useExplorerStore.getState() as Record<string, unknown> & {
      tagFilter: string[];
      tagMatchMode: string;
      uncertaintyFilter: string;
      bookmarkedFilter: string;
      draftFilter: string;
      contentTypeFilter: string[];
      directoryBadgeVisibility: Record<string, boolean>;
    };

    expect(state.tagFilter).toEqual(["数学"]);
    expect(state.tagMatchMode).toBe("all");
    expect(state.uncertaintyFilter).toBe("on");
    expect(state.bookmarkedFilter).toBe("off");
    expect(state.draftFilter).toBe("on");
    expect(state.contentTypeFilter).toEqual(["card"]);
    expect(state.directoryBadgeVisibility).toEqual({
      uncertainty: false,
      bookmarked: true,
      tags: false,
    });
    expect(state.recent).toBeUndefined();
    expect(state.explorerTab).toBeUndefined();
    expect(state.activeTab).toBeUndefined();
  });

  it("normalizes invalid persisted filter values", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          tagFilter: ["英語", 42, null],
          tagMatchMode: "broken",
          uncertaintyFilter: "broken",
          bookmarkedFilter: "broken",
          draftFilter: "broken",
          contentTypeFilter: ["note"],
          directoryBadgeVisibility: {
            uncertainty: "yes",
            bookmarked: false,
          },
        },
        version: 0,
      }),
    );

    const { useExplorerStore } = await import("@/hooks/folder/useExplorerStore");
    await flushHydration();

    const state = useExplorerStore.getState();

    expect(state.tagFilter).toEqual(["英語"]);
    expect(state.tagMatchMode).toBe("any");
    expect(state.uncertaintyFilter).toBe("any");
    expect(state.bookmarkedFilter).toBe("any");
    expect(state.draftFilter).toBe("any");
    expect(state.contentTypeFilter).toEqual(["card", "pdf"]);
    expect(state.directoryBadgeVisibility).toEqual({
      uncertainty: true,
      bookmarked: false,
      tags: true,
    });
  });
});
