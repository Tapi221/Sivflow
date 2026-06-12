type BreadcrumbCrumb = {
  label: string;
  /** react-router-dom の to 文字列。省略時はクリック不可。 */
  to?: string;
  /** クリック時にサイドバー選択を同期するフォルダ ID。null はルートへ戻す。 */
  folderId?: string | null;
};
type ExplorerBreadcrumbContext = {
  folderId: string | null;
  cardSet: { id: string; label: string; } | null;
};



const EMPTY_EXPLORER_BREADCRUMB_CONTEXT: ExplorerBreadcrumbContext = { folderId: null, cardSet: null };



const areExplorerBreadcrumbContextsEqual = (a: ExplorerBreadcrumbContext, b: ExplorerBreadcrumbContext): boolean => a.folderId === b.folderId && a.cardSet?.id === b.cardSet?.id && a.cardSet?.label === b.cardSet?.label;



export { EMPTY_EXPLORER_BREADCRUMB_CONTEXT, areExplorerBreadcrumbContextsEqual };


export type { BreadcrumbCrumb, ExplorerBreadcrumbContext };
