export type BreadcrumbCrumb = {
  label: string;
  /** react-router-dom の to 文字列。省略時はクリック不可。 */
  to?: string;
  /** クリック時にサイドバー選択を同期するフォルダ ID。null はルートへ戻す。 */
  folderId?: string | null;
};

export type ExplorerBreadcrumbContext = {
  folderId: string | null;
  cardSet: { id: string; label: string } | null;
};

export const EMPTY_EXPLORER_BREADCRUMB_CONTEXT: ExplorerBreadcrumbContext = {
  folderId: null,
  cardSet: null,
};

export const areExplorerBreadcrumbContextsEqual = (
  a: ExplorerBreadcrumbContext,
  b: ExplorerBreadcrumbContext,
): boolean =>
  a.folderId === b.folderId &&
  a.cardSet?.id === b.cardSet?.id &&
  a.cardSet?.label === b.cardSet?.label;
