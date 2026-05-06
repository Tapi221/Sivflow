import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem, Folder } from "@/types";

export type PdfDashboardRow = {
  id: string;
  title: string;
  fileName: string;
  folderId: string;
  categoryLabel: string;
  folderPathLabel: string;
  storagePathLabel: string;
  pageCount: number | null;
  currentPage: number | null;
  progressPercent: number | null;
  updatedAt: Date | null;
  lastViewedAt: Date | null;
  tags: string[];
  orderIndex: number;
};

type ViewerStateWithLastOpenedAt = NonNullable<DocumentItem["viewerState"]> & {
  lastOpenedAt?: unknown;
};

type BuildPdfDashboardRowsParams = {
  documents: DocumentItem[];
  folders: Folder[];
  tagById: ReadonlyMap<string, { name: string }>;
};

const toDate = (value: unknown): Date | null => {
  return normalizeDate(value);
};

const resolveFolderName = (folder: Folder | undefined): string => {
  return folder?.folderName?.trim() || "未分類";
};

const resolveCurrentPage = (document: DocumentItem): number | null => {
  const currentPage = document.viewerState?.currentPage;

  if (
    typeof currentPage !== "number" ||
    !Number.isFinite(currentPage) ||
    currentPage <= 0
  ) {
    return null;
  }

  return Math.floor(currentPage);
};

const resolveProgressPercent = (document: DocumentItem): number | null => {
  const currentPage = resolveCurrentPage(document);
  const pageCount = document.pageCount ?? null;

  if (!currentPage || !pageCount || pageCount <= 0) {
    return null;
  }

  return Math.max(
    0,
    Math.min(100, Math.round((currentPage / pageCount) * 100)),
  );
};

const buildFolderPath = (
  folderId: string,
  folderById: Map<string, Folder>,
): string[] => {
  const path: string[] = [];
  const visited = new Set<string>();
  let currentFolderId: string | null | undefined = folderId;

  while (currentFolderId && !visited.has(currentFolderId)) {
    const folder = folderById.get(currentFolderId);

    if (!folder) {
      break;
    }

    path.unshift(resolveFolderName(folder));
    visited.add(currentFolderId);
    currentFolderId = folder.parentFolderId ?? null;
  }

  return path;
};

const resolveCategoryLabel = (
  folderId: string,
  folderById: Map<string, Folder>,
): string => {
  const path = buildFolderPath(folderId, folderById);
  return path[0] ?? "未分類";
};

const resolveDisplayTags = (
  document: DocumentItem,
  tagById: ReadonlyMap<string, { name: string }>,
): string[] => {
  const explicitTags = (Array.isArray(document.tags) ? document.tags : [])
    .map((tagIdOrName) => tagById.get(tagIdOrName)?.name ?? tagIdOrName)
    .filter(
      (label): label is string =>
        typeof label === "string" && label.trim().length > 0,
    );

  return Array.from(new Set(explicitTags)).slice(0, 3);
};

export const buildPdfDashboardRows = ({
  documents,
  folders,
  tagById,
}: BuildPdfDashboardRowsParams): PdfDashboardRow[] => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));

  return documents
    .filter((document) => document.kind === "pdf")
    .map((document) => {
      const folderPath = buildFolderPath(document.folderId, folderById);
      const categoryLabel = resolveCategoryLabel(document.folderId, folderById);
      const viewerState = (document.viewerState ??
        null) as ViewerStateWithLastOpenedAt | null;
      const updatedAt = toDate(document.updatedAt);
      const lastViewedAt = toDate(viewerState?.lastOpenedAt);

      return {
        id: document.id,
        title:
          document.title?.trim() || document.fileName?.trim() || "無題のPDF",
        fileName:
          document.fileName?.trim() || document.title?.trim() || "無題のPDF",
        folderId: document.folderId,
        categoryLabel,
        folderPathLabel: folderPath.join(" / ") || "未分類",
        storagePathLabel: ["ライブラリ", "PDF", ...folderPath].join(" / "),
        pageCount: document.pageCount ?? null,
        currentPage: resolveCurrentPage(document),
        progressPercent: resolveProgressPercent(document),
        updatedAt,
        lastViewedAt,
        tags: resolveDisplayTags(document, tagById),
        orderIndex: Number(document.orderIndex) || 0,
      } satisfies PdfDashboardRow;
    })
    .sort((left, right) => {
      const rightTime = right.updatedAt?.getTime() ?? 0;
      const leftTime = left.updatedAt?.getTime() ?? 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      if (right.orderIndex !== left.orderIndex) {
        return right.orderIndex - left.orderIndex;
      }

      return left.title.localeCompare(right.title, "ja");
    });
};
