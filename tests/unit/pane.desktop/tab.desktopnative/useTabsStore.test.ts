// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const WORKSPACE_TABS_STORAGE_KEY = "workspace.tabs";

const flushHydration = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.resetModules();
  localStorage.clear();
});

describe("useWorkspaceTabsStore", () => {
  it("updates an existing explorer tab state when opening a project", async () => {
    localStorage.setItem(
      WORKSPACE_TABS_STORAGE_KEY,
      JSON.stringify({
        state: {
          tabs: [
            {
              id: "explorer:default",
              kind: "explorer",
              title: "Library",
              explorerState: {
                isHomeOnlyMode: false,
                isSectionListMode: true,
                selectedFolderId: null,
                selectedItem: null,
              },
              isClosable: true,
              sectionKey: "library",
            },
          ],
          activeTabId: "explorer:default",
          lastOpenedTabId: "explorer:default",
        },
        version: 1,
      }),
    );

    const { useWorkspaceTabsStore } = await import("@/pane.desktop/tab.desktopnative/hooks/useTabsStore");
    await flushHydration();

    useWorkspaceTabsStore.getState().openExplorerTab({
      id: "explorer:default",
      title: "Library",
      explorerState: {
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedFolderId: "project-1",
        selectedItem: null,
      },
    });

    const state = useWorkspaceTabsStore.getState();
    const explorerTab = state.tabs.find((tab) => tab.id === "explorer:default");

    expect(explorerTab?.kind).toBe("explorer");
    expect(explorerTab?.kind === "explorer" ? explorerTab.explorerState : null).toEqual({
      isHomeOnlyMode: false,
      isSectionListMode: false,
      selectedFolderId: "project-1",
      selectedItem: null,
    });
    expect(state.activeTabId).toBe("explorer:default");
  });
});
