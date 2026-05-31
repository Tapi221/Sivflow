// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { ProjectListSidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";

const mocks = vi.hoisted(() => {
  const rootFolders = [{ id: "project-1", folderName: "Project Alpha", folderColor: "#bdebd0" }];
  const openExplorerTab = vi.fn();
  const createFolder = vi.fn();
  const updateFolder = vi.fn();
  const deleteFolder = vi.fn();
  const createCardSet = vi.fn();
  const handleToolbarAddDocument = vi.fn();
  const handleToolbarFileInputChange = vi.fn();
  const workspaceState = { tabs: [{ id: "tab-1", kind: "explorer", explorerState: { isSectionListMode: false, selectedFolderId: null } }], activeTabId: "tab-1", openExplorerTab };

  return { rootFolders, workspaceState, openExplorerTab, createFolder, updateFolder, deleteFolder, createCardSet, handleToolbarAddDocument, handleToolbarFileInputChange };
});

vi.mock("@/components/card/hooks/useCardSets", () => ({ useCardSets: () => ({ cardSets: [], loading: false, createCardSet: mocks.createCardSet }) }));
vi.mock("@/components/folder/hooks/useExplorerDerivedData", () => ({ useExplorerDerivedData: () => ({ rootFolders: mocks.rootFolders, getChildFolders: () => [], getFolderContentCount: () => 3, getNextOrderIndex: () => 0 }) }));
vi.mock("@/components/folder/hooks/useFolderDocumentUpload", () => ({ useFolderDocumentUpload: () => ({ fileInputRef: { current: null }, handleToolbarAddDocument: mocks.handleToolbarAddDocument, currentFileAccept: "application/pdf", handleToolbarFileInputChange: mocks.handleToolbarFileInputChange }) }));
vi.mock("@/chip/toggle/Toggle.foldertag", () => ({ ToggleFolderTag: () => React.createElement("div", { "data-testid": "folder-tag-toggle" }) }));
vi.mock("@/hooks/folder/useFolderCommands", () => ({ useFolderCommands: () => ({ createFolder: mocks.createFolder, updateFolder: mocks.updateFolder, deleteFolder: mocks.deleteFolder }) }));
vi.mock("@/hooks/folder/useFoldersRead", () => ({ useFoldersRead: () => ({ folders: mocks.rootFolders, loading: false, error: null }) }));
vi.mock("@/hooks/folder/useFolderTagModeStore", () => ({ useFolderTagModeStore: (selector: (state: unknown) => unknown) => selector({ folderTagMode: "folder", setFolderTagMode: vi.fn() }) }));
vi.mock("@/hooks/platform/useDocumentsRead", () => ({ useDocumentsRead: () => ({ documents: [], loading: false, error: null }) }));
vi.mock("@/pane.desktop/leftpane/folder/TagTreeSidebar", () => ({ TagTreeSidebar: () => React.createElement("aside", { "data-testid": "tag-tree-sidebar" }) }));
vi.mock("@/pane.desktop/tab.desktopnative/hooks/useTabsStore", () => ({ useWorkspaceTabsStore: (selector: (state: unknown) => unknown) => selector(mocks.workspaceState) }));

const SOURCE_PATH = resolve(process.cwd(), "src/pane.desktop/leftpane/folder/LayeredDirectorySidebar.tsx");

const getFunctionSource = (source: string, functionName: string): string => {
  const marker = `const ${functionName} =`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);

  const nextConst = source.indexOf("\nconst ", start + marker.length);
  const end = nextConst > start ? nextConst : source.indexOf("\nexport ", start + marker.length);
  expect(end).toBeGreaterThan(start);

  return source.slice(start, end);
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.workspaceState.tabs = [{ id: "tab-1", kind: "explorer", explorerState: { isSectionListMode: false, selectedFolderId: null } }];
  mocks.workspaceState.activeTabId = "tab-1";
});

describe("LayeredDirectorySidebar project list", () => {
  it("uses the flat project list for MY PROJECTS instead of the hierarchy tree", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pane.desktop/leftpane/Sidebar.LayeredDirectory.tsx"), "utf8");
    const sidebarSource = getFunctionSource(source, "SidebarLayeredDirectory");

    expect(sidebarSource).toContain("<ProjectListSidebar />");
    expect(sidebarSource).toContain("<LibraryHierarchySidebar projectRootId={selectedProjectId} />");
  });

  it("shows a selected project name above its child hierarchy", () => {
    mocks.workspaceState.tabs = [{ id: "tab-1", kind: "explorer", explorerState: { isSectionListMode: false, selectedFolderId: "project-1" } }];

    render(React.createElement(SidebarLayeredDirectory));

    expect(screen.getByRole("button", { name: "プロジェクト一覧を開く" }).textContent).toContain("Project Alpha");
    expect(screen.getByText("フォルダがありません")).toBeTruthy();
  });

  it("does not render project content count badges", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    const projectListItemSource = getFunctionSource(source, "ProjectListItem");
    const projectListSidebarSource = getFunctionSource(source, "ProjectListSidebar");

    expect(projectListItemSource).not.toContain("contentCount");
    expect(projectListItemSource).not.toContain("rounded-full");
    expect(projectListSidebarSource).not.toContain("getFolderContentCount");
  });

  it("opens the selected project in explorer mode on click", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.click(screen.getByRole("button", { name: "Project Alpha" }));

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

  it("opens the layered project context menu on right-click", () => {
    render(React.createElement(ProjectListSidebar));

    fireEvent.contextMenu(screen.getByRole("button", { name: "Project Alpha" }), { clientX: 160, clientY: 180 });

    expect(screen.getByRole("menu", { name: "layered project context menu" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "色を変更" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "名前を変更" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "新規カードセット" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "新規フォルダ" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "PDFをインポート" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "非表示" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "削除" })).toBeTruthy();
  });
});
