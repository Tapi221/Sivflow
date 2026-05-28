import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";

export const WORKSPACE_DEFAULT_EXPLORER_TAB_ID = "explorer:default" as const;

/**
 * サイドバーのセクション定義
 */
export type WorkspaceSidebarSection =
  | "home"
  | "review"
  | "library"
  | "schedule"
  | "settings";

export type WorkspaceRouteSection = Exclude<WorkspaceSidebarSection, "library">;

/**
 * ルートタブID（固定ページ）
 */
export type WorkspaceRouteTabId =
  | "route:home"
  | "route:review"
  | "route:schedule"
  | "route:settings";

/**
 * タブ種別
 */
export type WorkspaceTabKind = "route" | "explorer" | "document" | "card";

/**
 * 全タブ共通ベース
 */
type WorkspaceTabBase = {
  title: string;
  isClosable: boolean;
  sectionKey: WorkspaceSidebarSection;
};

/**
 * ルートタブ（画面遷移系）
 */
export type WorkspaceRouteTab = Omit<WorkspaceTabBase, "sectionKey"> & {
  id: WorkspaceRouteTabId;
  kind: "route";
  routePath: string;
  sectionKey: WorkspaceRouteSection;
};

/**
 * エクスプローラタブ（状態保持型）
 */
export type WorkspaceExplorerTab = WorkspaceTabBase & {
  id: `explorer:${string}`;
  kind: "explorer";
  explorerState: ExplorerRouteState;
};

/**
 * ドキュメントタブ
 */
export type WorkspaceDocumentTab = WorkspaceTabBase & {
  id: `document:${string}`;
  kind: "document";
  documentId: string;
  folderId: string | null;
};

/**
 * カードタブ
 */
export type WorkspaceCardTab = WorkspaceTabBase & {
  id: `card:${string}`;
  kind: "card";
  cardId: string;
  folderId: string | null;
};

/**
 * 全タブユニオン
 */
export type WorkspaceTab =
  | WorkspaceRouteTab
  | WorkspaceExplorerTab
  | WorkspaceDocumentTab
  | WorkspaceCardTab;

/**
 * エンティティ系タブ（ルート・explorer除外）
 */
export type WorkspaceEntityTab = Exclude<
  WorkspaceTab,
  WorkspaceExplorerTab | WorkspaceRouteTab
>;

/**
 * ルートタブ定義
 */
export const WORKSPACE_ROUTE_TABS = [
  {
    id: "route:home",
    kind: "route",
    title: "Home",
    routePath: "/schedule",
    isClosable: true,
    sectionKey: "home",
  },
  {
    id: "route:review",
    kind: "route",
    title: "Review",
    routePath: "/study",
    isClosable: true,
    sectionKey: "review",
  },
  {
    id: "route:schedule",
    kind: "route",
    title: "Schedule",
    routePath: "/schedule",
    isClosable: true,
    sectionKey: "schedule",
  },
  {
    id: "route:settings",
    kind: "route",
    title: "設定",
    routePath: "/settings",
    isClosable: true,
    sectionKey: "settings",
  },
] as const satisfies readonly WorkspaceRouteTab[];

/**
 * Explorer初期状態
 */
export const createDefaultExplorerRouteState = (): ExplorerRouteState => ({
  isHomeOnlyMode: false,
  isSectionListMode: true,
  selectedFolderId: null,
  selectedItem: null,
});

/**
 * section → routeタブ解決
 */
export const resolveRouteTabBySection = (
  sectionKey: WorkspaceRouteSection,
): WorkspaceRouteTab => {
  const matchedTab = WORKSPACE_ROUTE_TABS.find(
    (tab) => tab.sectionKey === sectionKey,
  );

  if (!matchedTab) {
    throw new Error(`Unknown workspace route section: ${sectionKey}`);
  }

  return matchedTab;
};
