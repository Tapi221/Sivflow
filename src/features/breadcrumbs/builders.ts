import { getCardText } from "@/domain/card/content";

import type {
  BreadcrumbCrumb,
  ExplorerBreadcrumbContext,
} from "./breadcrumbs.types";

import type { Card, DocumentItem, Folder, SelectedExplorerItem } from "@/types";
import type { CardSet } from "@/types/domain/cardSet";

type FolderLike = Pick<Folder, "id" | "folderName" | "parentFolderId">;

const PAGE_LABELS: Record<string, string> = {
  folders: "フォルダ一覧",
  calendar: "カレンダー",
  gallery: "ギャラリー",
  trash: "ゴミ箱",
  study: "学習モード",
  cardedit: "カード編集",
  cardsetview: "カード閲覧",
  directory: "ディレクトリ",
  dictionary: "辞書",
  questions: "疑問集",
};

const HOME_ROUTE = "/folders?home=1";
const FOLDER_LIST_ROUTE = "/folders?view=section-list";

const buildFolderRoute = (folderId: string | null | undefined): string => {
  if (!folderId) {
    return FOLDER_LIST_ROUTE;
  }

  const searchParams = new URLSearchParams();
  searchParams.set("folderId", folderId);

  return `/folders?${searchParams.toString()}`;
};

const resolveTitleBarFolderListRoute = (
  extraCrumbs: BreadcrumbCrumb[],
): string => {
  const currentFolderCrumb = [...extraCrumbs]
    .reverse()
    .find((crumb) => crumb.folderId !== undefined);

  return buildFolderRoute(currentFolderCrumb?.folderId);
};

export const areBreadcrumbCrumbsEqual = (
  a: BreadcrumbCrumb[],
  b: BreadcrumbCrumb[],
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  return a.every((crumb, index) => {
    const other = b[index];
    return (
      crumb.label === other.label &&
      crumb.to === other.to &&
      crumb.folderId === other.folderId
    );
  });
};

export const buildRouteBreadcrumbs = ({
  pathname,
  search,
}: {
  pathname: string;
  search: string;
}): BreadcrumbCrumb[] => {
  const searchParams = new URLSearchParams(search);
  const isHomeOnlyMode =
    pathname.toLowerCase() === "/folders" && searchParams.get("home") === "1";

  if (isHomeOnlyMode) {
    return [{ label: "ホーム", to: undefined }];
  }

  const segments = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbCrumb[] = [{ label: "ホーム", to: HOME_ROUTE }];

  segments.forEach((segment, index) => {
    const label = PAGE_LABELS[segment.toLowerCase()] ?? segment;
    const to = "/" + segments.slice(0, index + 1).join("/");
    crumbs.push({ label, to });
  });

  if (crumbs.length > 1) {
    crumbs[crumbs.length - 1] = {
      label: crumbs[crumbs.length - 1].label,
      to: undefined,
    };
  }

  return crumbs;
};

export const mergeTitleBarBreadcrumbs = ({
  pathname,
  baseCrumbs,
  extraCrumbs,
}: {
  pathname: string;
  baseCrumbs: BreadcrumbCrumb[];
  extraCrumbs: BreadcrumbCrumb[];
}): BreadcrumbCrumb[] => {
  if (extraCrumbs.length === 0) {
    return baseCrumbs;
  }

  const normalizedPathname = pathname.toLowerCase();
  const isCardSetViewPath = normalizedPathname.startsWith("/cardsetview");
  const isFoldersPath = normalizedPathname.startsWith("/folders");
  const shouldUseFolderListRoute = isCardSetViewPath || isFoldersPath;
  const folderListRoute = isFoldersPath
    ? FOLDER_LIST_ROUTE
    : isCardSetViewPath
      ? resolveTitleBarFolderListRoute(extraCrumbs)
      : FOLDER_LIST_ROUTE;
  const shouldReplaceBaseCrumbs =
    shouldUseFolderListRoute && baseCrumbs.length > 1;
  const baseCrumbsForMerge = shouldReplaceBaseCrumbs
    ? [baseCrumbs[0], { label: "フォルダ一覧", to: folderListRoute }]
    : baseCrumbs;

  const defaultLastBaseRoute = shouldUseFolderListRoute
    ? folderListRoute
    : HOME_ROUTE;

  const clickableBaseCrumbs = baseCrumbsForMerge.map((crumb, index) =>
    index === baseCrumbsForMerge.length - 1
      ? { ...crumb, to: crumb.to ?? defaultLastBaseRoute }
      : crumb,
  );

  const normalizedExtraCrumbs = extraCrumbs.map((crumb, index) =>
    index === extraCrumbs.length - 1 ? { ...crumb, to: undefined } : crumb,
  );

  return [...clickableBaseCrumbs, ...normalizedExtraCrumbs];
};

export const buildFolderPathCrumbs = ({
  folderId,
  folderById,
}: {
  folderId: string | null | undefined;
  folderById: Map<string, FolderLike>;
}): BreadcrumbCrumb[] => {
  if (!folderId) {
    return [];
  }

  const path: FolderLike[] = [];
  let currentFolder = folderById.get(folderId) ?? null;

  while (currentFolder) {
    path.unshift(currentFolder);
    currentFolder = currentFolder.parentFolderId
      ? (folderById.get(currentFolder.parentFolderId) ?? null)
      : null;
  }

  return path.map((folder) => ({
    label: folder.folderName,
    to: `/folders?folderId=${folder.id}`,
    folderId: folder.id,
  }));
};

export const buildExplorerBreadcrumbs = ({
  selectedFolderId,
  explorerBreadcrumbContext,
  selectedItem,
  folderById,
  cardById,
  documentById,
}: {
  selectedFolderId: string | null;
  explorerBreadcrumbContext: ExplorerBreadcrumbContext;
  selectedItem: SelectedExplorerItem;
  folderById: Map<string, FolderLike>;
  cardById: Map<string, Card>;
  documentById: Map<string, DocumentItem>;
}): BreadcrumbCrumb[] => {
  const breadcrumbFolderId =
    selectedFolderId ?? explorerBreadcrumbContext.folderId ?? null;

  const crumbs = buildFolderPathCrumbs({
    folderId: breadcrumbFolderId,
    folderById,
  });

  if (selectedItem?.type === "card") {
    const card = cardById.get(selectedItem.id);
    if (card) {
      const label =
        card.title?.trim() ||
        getCardText(card, "question").trim().slice(0, 20) ||
        "カード";
      crumbs.push({ label });
    }
  } else if (selectedItem?.type === "document") {
    const documentItem = documentById.get(selectedItem.id);
    if (documentItem) {
      crumbs.push({
        label: documentItem.title || documentItem.fileName || "ドキュメント",
      });
    }
  }

  if (explorerBreadcrumbContext.cardSet?.label) {
    crumbs.push({ label: explorerBreadcrumbContext.cardSet.label });
  }

  return crumbs;
};

export const buildCardSetViewBreadcrumbs = ({
  folderId,
  selectedCardSet,
  selectedCard,
  sortedCards,
  folderById,
}: {
  folderId: string | null;
  selectedCardSet: CardSet | null;
  selectedCard: Card | null;
  sortedCards: Card[];
  folderById: Map<string, FolderLike>;
}): BreadcrumbCrumb[] => {
  const crumbFolderId = folderId ?? selectedCardSet?.folderId ?? null;
  const crumbs = buildFolderPathCrumbs({
    folderId: crumbFolderId,
    folderById,
  });

  if (selectedCardSet) {
    const searchParams = new URLSearchParams();
    if (crumbFolderId) {
      searchParams.set("folderId", crumbFolderId);
    }
    searchParams.set("cardSetId", selectedCardSet.id);

    crumbs.push({
      label: selectedCardSet.name || "カードセット",
      to: `/folders?${searchParams.toString()}`,
      folderId: crumbFolderId,
    });
  }

  if (selectedCard) {
    const title = selectedCard.title?.trim() ?? "";
    const cardIndex = sortedCards.findIndex(
      (card) => card.id === selectedCard.id,
    );
    const current = cardIndex >= 0 ? cardIndex + 1 : 1;
    const total = Math.max(1, sortedCards.length);
    const label = title
      ? `${current}/${total} : ${title}`
      : `${current}/${total}`;
    crumbs.push({ label });
  }

  return crumbs;
};
