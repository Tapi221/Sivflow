import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";



/**
 * サイドバーのセクション定義
 */
type WorkspaceSidebarSection = | "home" | "review" | "library" | "schedule" | "settings";
/**
 * 全タブ共通ベース
 */
type WorkspaceTabBase = {
  title: string;
  isClosable: boolean;
  sectionKey: WorkspaceSidebarSection;
};
type WorkspaceRouteSection = Exclude<WorkspaceSidebarSection, "library">;
/**
 * ルートタブID（固定ページ）
 */
type WorkspaceRouteTabId = | "route:home" | "route:review" | "route:schedule" | "route:settings";
/**
 * タブ種別
 */
type WorkspaceTabKind = "route" | "explorer" | "document" | "card" | "note";
/**
 * ルートタブ（画面遷移系）
 */
type WorkspaceRouteTab = Omit<WorkspaceTabBase, "sectionKey"> & { id: WorkspaceRouteTabId;
  kind: "route";
  routePath: string;
  sectionKey: WorkspaceRouteSection;
};
/**
 * エクスプローラタブ（状態保持型）
 */
type WorkspaceExplorerTab = WorkspaceTabBase & { id: `explorer:${string}`;
  kind: "explorer";
  explorerState: ExplorerRouteState;
};
/**
 * ドキュメントタブ
 */
type WorkspaceDocumentTab = WorkspaceTabBase & { id: `document:${string}`;
  kind: "document";
  documentId: string;
  folderId: string | null;
};
/**
 * カードタブ
 */
type WorkspaceCardTab = WorkspaceTabBase & { id: `card:${string}`;
  kind: "card";
  cardId: string;
  folderId: string | null;
};
/**
 * ノートタブ
 */
type WorkspaceNoteTab = WorkspaceTabBase & { id: `note:${string}`;
  kind: "note";
  noteId: string;
  folderId: string | null;
};
/**
 * 全タブユニオン
 */
type WorkspaceTab = | WorkspaceRouteTab | WorkspaceExplorerTab | WorkspaceDocumentTab | WorkspaceCardTab | WorkspaceNoteTab;
/**
 * エンティティ系タブ（ルート・explorer除外）
 */
type WorkspaceEntityTab = Exclude<WorkspaceTab, WorkspaceExplorerTab | WorkspaceRouteTab>;



const WORKSPACE_DEFAULT_EXPLORER_TAB_ID = "explorer:default" as const;
/**
 * ルートタブ定義
 */
const WORKSPACE_ROUTE_TABS = [{ id: "route:home", kind: "route", title: "Home", routePath: "/schedule", isClosable: true, sectionKey: "home" }, { id: "route:review", kind: "route", title: "Review", routePath: "/study", isClosable: true, sectionKey: "review" }, { id: "route:schedule", kind: "route", title: "Schedule", routePath: "/schedule", isClosable: true, sectionKey: "schedule" }, { id: "route:settings", kind: "route", title: "設定", routePath: "/settings", isClosable: true, sectionKey: "settings" }] as const satisfies readonly WorkspaceRouteTab[];



/**
 * Explorer初期状態
 */
const createDefaultExplorerRouteState = (): ExplorerRouteState => ({ isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null });
/**
 * section → routeタブ解決
 */
const resolveRouteTabBySection = (sectionKey: WorkspaceRouteSection): WorkspaceRouteTab => {
  const matchedTab = WORKSPACE_ROUTE_TABS.find((tab) => tab.sectionKey === sectionKey);

  if (!matchedTab) {
    throw new Error(`Unknown workspace route section: ${sectionKey}`);
  }

  return matchedTab;
};



export { WORKSPACE_DEFAULT_EXPLORER_TAB_ID, WORKSPACE_ROUTE_TABS, createDefaultExplorerRouteState, resolveRouteTabBySection };


export type { WorkspaceSidebarSection, WorkspaceRouteSection, WorkspaceRouteTabId, WorkspaceTabKind, WorkspaceRouteTab, WorkspaceExplorerTab, WorkspaceDocumentTab, WorkspaceCardTab, WorkspaceNoteTab, WorkspaceTab, WorkspaceEntityTab };
