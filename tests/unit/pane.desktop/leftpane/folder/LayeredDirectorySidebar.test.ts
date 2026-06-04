// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";

const mocks = vi.hoisted(() => {
  const rootFolders = [{ id: "project-1", folderName: "Project Alpha", folderColor: "#bdebd0", isFavorite: undefined as boolean | undefined }];
  const childrenByParentId: Record<string, Array<{ id: string; folderName: string; folderColor?: string; isFavorite?: boolean }>> = {
    "project-1": [{ id: "folder-js", folderName: "Javascript" }],
    "folder-js": [{ id: "folder-es6", folderName: "ES6" }],
  };
  const getChildFolders = vi.fn((folderId: string) => childrenByParentId[folderId] ?? []);
  const openExplorerTab = vi.fn();
  const createFolder = vi.fn();
  const updateFolder = vi.fn();
  const deleteFolder = vi.fn();
  const createCardSet = vi.fn();
  const handleToolbarAddDocument = vi.fn();
  const handleToolbarFileInputChange = vi.fn();
  const workspaceState = { tabs: [{ id: "tab-1", kind: "explorer", sectionKey: "library", explorerState: { isHomeOnlyMode: false, isSectionListMode: false, selectedFolderId: null, selectedItem: null } }], activeTabId: "tab-1", openExplorerTab, openSectionTab: vi.fn() };

  return { rootFolders, childrenByParentId, getChildFolders, workspaceState, openExplorerTab, createFolder, updateFolder, deleteFolder, createCardSet, handleToolbarAddDocument, handleToolbarFileInputChange };
});

vi.mock("react-router-dom", () => ({ useOutletContext: () => ({ onToggleLeftPanel: undefined }) }));
vi.mock("@/components/card/hooks/useCardSets", () => ({ useCardSets: () => ({ cardSets: [], loading: false, createCardSet: mocks.createCardSet }) }));
vi.mock("@/components/folder/hooks/useExplorerDerivedData", () => ({ useExplorerDerivedData: () => ({ rootFolders: mocks.rootFolders, getChildFolders: mocks.getChildFolders, getFolderContentCount: () => 3, getNextOrderIndex: () => 0 }) }));
vi.mock("@/components/folder/hooks/useFolderDocumentUpload", () => ({ useFolderDocumentUpload: () => ({ fileInputRef: { current: null }, handleToolbarAddDocument: mocks.handleToolbarAddDocument, currentFileAccept: "application/pdf", handleToolbarFileInputChange: mocks.handleToolbarFileInputChange }) }));
vi.mock("@/contexts/auth/useAuthSession", () => ({ useAuthSession: () => ({ currentUser: { displayName: "Akari T", email: "akari@example.com" } }) }));
vi.mock("@/features/search/store/useSearchStore", () => ({ useSearchStore: (selector: (state: unknown) => unknown) => selector({ open: vi.fn() }) }));
vi.mock("@/hooks/folder/useFolderCommands", () => ({ useFolderCommands: () => ({ createFolder: mocks.createFolder, updateFolder: mocks.updateFolder, deleteFolder: mocks.deleteFolder }) }));
vi.mock("@/hooks/folder/useFoldersRead", () => ({ useFoldersRead: () => ({ folders: mocks.rootFolders, loading: false, error: null }) }));
vi.mock("@/hooks/folder/useFolderTagModeStore", () => ({ useFolderTagModeStore: (selector: (state: unknown) => unknown) => selector({ folderTagMode: "folder", setFolderTagMode: vi.fn() }) }));
vi.mock("@/hooks/platform/useDocumentsRead", () => ({ useDocumentsRead: () => ({ documents: [], loading: false, error: null }) }));
vi.mock("@/pane.desktop/leftpane/folder/TagTreeSidebar", () => ({ TagTreeSidebar: () => React.createElement("aside", { "data-testid": "tag-tree-sidebar" }) }));
vi.mock("@/pane.desktop/tab.desktopnative/hooks/useTabsStore", () => ({ useWorkspaceTabsStore: (selector: (state: unknown) => unknown) => selector(mocks.workspaceState) }));

const FOLDER_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/folder/LayeredDirectorySidebar.tsx");
const SIDEBAR_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/Sidebar.LayeredDirectory.tsx");
const originalRequestAnimationFrame = window.requestAnimationFrame;

const getFunctionSource = (source: string, functionName: string): string => {
  const marker = `const ${functionName} =`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextConst = source.indexOf("\nconst ", start + marker.length);
  const end = nextConst > start ? nextConst : source.indexOf("\nexport ", start + marker.length);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

const getTree = () => screen.getByRole("tree", { name: "ライブラリ" });

const getFolderRow = (name: string): HTMLElement => {
  const row = screen.getByText(name).closest("[data-folder-tree-row='true']");
  expect(row).not.toBeNull();
  return row as HTMLElement;
};

const mockRowRect = (row: HTMLElement, rect: Partial<DOMRect> = {}) => {
  const nextRect = { x: 0, y: 0, left: 0, top: 0, right: 240, bottom: 32, width: 240, height: 32, toJSON: () => ({}) } as DOMRect;
  Object.assign(nextRect, rect);
  Object.defineProperty(row, "getBoundingClientRect", { configurable: true, value: () => nextRect });
};

const createDataTransfer = (): DataTransfer => {
  const entries = new Map<string, string>();
  return {
    dropEffect: "none",
    effectAllowed: "all",
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
    types: [],
    clearData: vi.fn((format?: string) => { if (format) entries.delete(format); else entries.clear(); }),
    getData: vi.fn((format: string) => entries.get(format) ?? ""),
    setData: vi.fn((format: string, data: string) => { entries.set(format, data); }),
    setDragImage: vi.fn(),
  } as unknown as DataTransfer;
};

const resetWorkspaceSelection = (selectedFolderId: string | null) => {
  mocks.workspaceState.tabs = [{ id: "tab-1", kind: "explorer", sectionKey: "library", explorerState: { isHomeOnlyMode: false, isSectionListMode: selectedFolderId === null, selectedFolderId, selectedItem: null } }];
  mocks.workspaceState.activeTabId = "tab-1";
};

beforeEach(() => {
  window.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  }) as typeof window.requestAnimationFrame;
});

afterEach(() => {
  window.requestAnimationFrame = originalRequestAnimationFrame;
  cleanup();
  vi.clearAllMocks();
  resetWorkspaceSelection(null);
  mocks.rootFolders[0].isFavorite = undefined;
});

describe("LayeredDirectorySidebar project list", () => {
  it("switches from the project list to the selected folder child list", () => {
    const source = readFileSync(SIDEBAR_SOURCE_PATH, "utf8");
    const sidebarSource = getFunctionSource(source, "SidebarLayeredDirectory");

    expect(sidebarSource).toContain("<ProjectListSidebar />");
    expect(sidebarSource).toContain("<LibraryHierarchySidebar parentFolderId={selectedNavigationFolderId} />");
    expect(sidebarSource).not.toContain("projectRootId");
  });

  it("does not render the removed folder tag toggle", () => {
    const source = readFileSync(SIDEBAR_SOURCE_PATH, "utf8");
    const sidebarSource = getFunctionSource(source, "SidebarLayeredDirectory");

    expect(source).not.toContain("ToggleFolderTag");
    expect(sidebarSource).not.toContain("folder-tag-toggle");
  });

  it("resolves a nested selected folder and shows only that folder's children", () => {
    resetWorkspaceSelection("folder-js");

    render(React.createElement(SidebarLayeredDirectory));

    expect(screen.getByRole("button", { name: "プロジェクト一覧を開く" }).textContent).toContain("Javascript");
    expect(within(getTree()).getByText("ES6")).toBeTruthy();
    expect(within(getTree()).queryByText("Project Alpha")).toBeNull();
    expect(within(getTree()).queryByText("Javascript")).toBeNull();
  });

  it("does not render project content count badges", () => {
    const source = readFileSync(FOLDER_SOURCE_PATH, "utf8");
    const projectListSidebarSource = getFunctionSource(source, "ProjectListSidebar");

    expect(source).not.toContain("contentCount");
    expect(projectListSidebarSource).not.toContain("getFolderContentCount");
  });

  it("opens the selected project in explorer mode on click", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.click(screen.getByText("Project Alpha"));

    expect(mocks.openExplorerTab).toHaveBeenCalledWith({
      title: "Library",
      explorerState: {
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedFolderId: "project-1",
        selectedItem: null,
      },
    });
  });

  it("opens a nested folder in explorer mode on click", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.click(screen.getByText("Project Alpha"));
    fireEvent.click(screen.getByText("Javascript"));

    expect(mocks.openExplorerTab).toHaveBeenLastCalledWith({
      title: "Library",
      explorerState: {
        isHomeOnlyMode: false,
        isSectionListMode: false,
        selectedFolderId: "folder-js",
        selectedItem: null,
      },
    });
  });

  it("opens the layered project context menu on right-click", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.contextMenu(screen.getByText("Project Alpha"), { clientX: 160, clientY: 180 });

    expect(screen.getByRole("menu", { name: "layered project context menu" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "色を変更" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "名前を変更" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "新規カードセット" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "新規フォルダ" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "PDFをインポート" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "お気に入りに追加" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "非表示" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "削除" })).toBeTruthy();
  });

  it("marks the selected project as favorite from the context menu", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.contextMenu(screen.getByText("Project Alpha"), { clientX: 160, clientY: 180 });
    fireEvent.click(screen.getByRole("menuitem", { name: "お気に入りに追加" }));

    expect(mocks.updateFolder).toHaveBeenCalledWith("project-1", { isFavorite: true });
  });

  it("disables favorite action when the selected project is already favorite", () => {
    mocks.rootFolders[0].isFavorite = true;

    render(React.createElement(ProjectListSidebar));

    fireEvent.contextMenu(screen.getByText("Project Alpha"), { clientX: 160, clientY: 180 });

    expect(screen.getByRole("menuitem", { name: "お気に入りに追加" })).toBeDisabled();
  });

  it("persists a dragged folder before the target project with synced parent and order fields", async () => {
    render(React.createElement(ProjectListSidebar));
    fireEvent.click(screen.getByText("Project Alpha"));

    const sourceRow = getFolderRow("Javascript");
    const targetRow = getFolderRow("Project Alpha");
    mockRowRect(sourceRow);
    mockRowRect(targetRow);
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(sourceRow, { dataTransfer });
    fireEvent.dragOver(targetRow, { clientX: 12, clientY: 4, dataTransfer });
    fireEvent.drop(targetRow, { clientX: 12, clientY: 4, dataTransfer });

    await waitFor(() => {
      expect(mocks.updateFolder).toHaveBeenCalledWith("folder-js", { parentFolderId: null, orderIndex: 0 });
      expect(mocks.updateFolder).toHaveBeenCalledWith("project-1", { parentFolderId: null, orderIndex: 1 });
    });
  });

  it("persists a dragged folder after the target project without relying on delayed drag state", async () => {
    render(React.createElement(ProjectListSidebar));
    fireEvent.click(screen.getByText("Project Alpha"));

    const sourceRow = getFolderRow("Javascript");
    const targetRow = getFolderRow("Project Alpha");
    mockRowRect(sourceRow);
    mockRowRect(targetRow);
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(sourceRow, { dataTransfer });
    fireEvent.dragOver(targetRow, { clientX: 12, clientY: 28, dataTransfer });
    fireEvent.drop(targetRow, { clientX: 12, clientY: 28, dataTransfer });

    await waitFor(() => {
      expect(mocks.updateFolder).toHaveBeenCalledWith("folder-js", { parentFolderId: null, orderIndex: 1 });
    });
  });
});
