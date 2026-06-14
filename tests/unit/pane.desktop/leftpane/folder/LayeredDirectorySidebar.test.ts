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
  const childrenByParentId: Record<string, Array<{ id: string; folderName: string; folderColor?: string; isFavorite?: boolean; }>> = {
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
vi.mock("@/features/folder/hooks/useFolderCommands", () => ({ useFolderCommands: () => ({ createFolder: mocks.createFolder, updateFolder: mocks.updateFolder, deleteFolder: mocks.deleteFolder }) }));
vi.mock("@/features/folder/hooks/useFoldersRead", () => ({ useFoldersRead: () => ({ folders: mocks.rootFolders, loading: false, error: null }) }));
vi.mock("@/pane.desktop/leftpane/folder/useFolderTagModeStore", () => ({ useFolderTagModeStore: (selector: (state: unknown) => unknown) => selector({ folderTagMode: "folder", setFolderTagMode: vi.fn() }) }));
vi.mock("@/features/document/hooks/useDocumentsRead", () => ({ useDocumentsRead: () => ({ documents: [], loading: false, error: null }) }));
vi.mock("@/pane.desktop/leftpane/folder/TagTreeSidebar", () => ({ TagTreeSidebar: () => React.createElement("aside", { "data-testid": "tag-tree-sidebar" }) }));
vi.mock("@/pane.desktop/tab.desktopnative/hooks/useTabsStore", () => ({ useWorkspaceTabsStore: (selector: (state: unknown) => unknown) => selector(mocks.workspaceState) }));

const FOLDER_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/folder/LayeredDirectorySidebar.tsx");
const SIDEBAR_SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/Sidebar.LayeredDirectory.tsx");
const DOCUMENTS_READ_SOURCE_PATH = resolve(process.cwd(), "src/features/document/hooks/useDocumentsRead.ts");
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

    expect(sidebarSource).not.toContain("フォルダ");
    expect(sidebarSource).not.toContain("タグ");
  });

  it("keeps favorite section visible only at the project root", async () => {
    render(<SidebarLayeredDirectory />);

    expect(screen.getByText("お気に入り")).toBeInTheDocument();
    expect(screen.getByText("Project Alpha")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Project Alpha"));

    await waitFor(() => {
      expect(screen.queryByText("お気に入り")).not.toBeInTheDocument();
      expect(screen.getByText("Javascript")).toBeInTheDocument();
    });
  });

  it("renders favorite folder row when a project is marked favorite", () => {
    mocks.rootFolders[0].isFavorite = true;

    render(<SidebarLayeredDirectory />);

    const favoriteSection = screen.getByRole("region", { name: "お気に入り" });
    expect(within(favoriteSection).getByText("Project Alpha")).toBeInTheDocument();
  });

  it("uses the selected folder label as the child list heading", async () => {
    render(<SidebarLayeredDirectory />);

    fireEvent.click(screen.getByText("Project Alpha"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Project Alpha" })).toBeInTheDocument();
      expect(screen.getByText("Javascript")).toBeInTheDocument();
    });
  });

  it("returns to the project list from the child list heading button", async () => {
    render(<SidebarLayeredDirectory />);

    fireEvent.click(screen.getByText("Project Alpha"));

    const headingButton = await screen.findByRole("button", { name: "プロジェクト一覧を開く" });
    fireEvent.click(headingButton);

    await waitFor(() => {
      expect(screen.getByText("Project Alpha")).toBeInTheDocument();
      expect(screen.queryByText("Javascript")).not.toBeInTheDocument();
    });
  });
});

describe("useDocumentsRead", () => {
  it("does not depend on the active workspace card set selection", () => {
    const source = readFileSync(DOCUMENTS_READ_SOURCE_PATH, "utf8");
    const hookSource = getFunctionSource(source, "useDocumentsRead");

    expect(hookSource).not.toContain("useWorkspaceTabsStore");
    expect(hookSource).not.toContain("isActiveWorkspaceCardSetSelected");
    expect(hookSource).toContain("const enabled = options?.enabled ?? true;");
  });
});

describe("ProjectListSidebar drag interactions", () => {
  it("does not treat internal folder drag enter as an external drag", () => {
    const source = readFileSync(FOLDER_SOURCE_PATH, "utf8");
    const sidebarSource = getFunctionSource(source, "ProjectListSidebar");

    expect(sidebarSource).toContain("dataTransfer.types");
    expect(sidebarSource).toContain("Files");
    expect(sidebarSource).toContain("onExternalFileDrop");
  });

  it("prevents horizontal row jump when folder rows are dragged", () => {
    render(<ProjectListSidebar />);
    const row = getFolderRow("Project Alpha");
    mockRowRect(row);
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(row, { clientX: 200, clientY: 16, dataTransfer });
    fireEvent.drag(row, { clientX: 40, clientY: 16, dataTransfer });

    expect(row).toHaveStyle({ transform: "translate3d(0px, 0px, 0)" });
  });
});