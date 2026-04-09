export type ExplorerBreadcrumbContext = {
  folderId: string | null;
  cardSet: {
    id: string;
    label: string;
  } | null;
};

export const EMPTY_EXPLORER_BREADCRUMB_CONTEXT: ExplorerBreadcrumbContext = {
  folderId: null,
  cardSet: null,
};
