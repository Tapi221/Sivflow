import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem, Folder } from "@/types";

export type PdfLibraryRow = {
  id: string;
  title: string;
  fileName: string;
  folderId: string | null;
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

export const PAGE_SIZE = 10;

const toDate = (value: unknown): Date | null => {
  return normalizeDate(value);
};

const resolveFolderName = (folder: Folder | undefined): string => {
  return folder?.folderName?.trim() || "未分類";
};

const buildFolderPath = (
  folderId: string | null | undefined,
  folderById: Map<string, Folder>,
): string[] => {
  if (!folderId) {
    return [];
  }

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
  folderId: string | null | undefined,
  folderById: Map<string, Folder>,
): string => {
  const path = buildFolderPath(folderId, folderById);
  return path[0] ?? "未分類";
};

const resolveDisplayTags = (
  document: DocumentItem,
  categoryLabel: string,
  folderPath: string[],
  tagById: ReadonlyMap<string, { name: string }>,
): string[] => {
  const explicitTags = (Array.isArray(document.tags) ? document.tags : [])
    .map((tagIdOrName) => tagById.get(tagIdOrName)?.name ?? tagIdOrName)
    .filter(
      (label): label is string =>
        typeof label === "string" && label.trim().length > 0,
    );

  if (explicitTags.length > 0) {
    return explicitTags.slice(0, 3);
  }

  const fallbackTags = [categoryLabel, folderPath[1]].filter(
    (label): label is string =>
      typeof label === "string" && label.trim().length > 0,
  );

  return Array.from(new Set(fallbackTags)).slice(0, 3);
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

export const formatDateTime = (value: Date | null): string => {
  if (!value) {
    return "未記録";
  }

  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

export const formatPageCount = (value: number | null): string => {
  if (!value || value <= 0) {
    return "—";
  }

  return String(value);
};

export const buildPdfLibraryRows = ({
  documents,
  folders,
  tagById,
}: {
  documents: DocumentItem[];
  folders: Folder[];
  tagById: ReadonlyMap<string, { name: string }>;
}): PdfLibraryRow[] => {
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
        folderId: document.folderId ?? null,
        categoryLabel,
        folderPathLabel: folderPath.join(" / ") || "未分類",
        storagePathLabel: ["ライブラリ", "PDF", ...folderPath].join(" / "),
        pageCount: document.pageCount ?? null,
        currentPage: resolveCurrentPage(document),
        progressPercent: resolveProgressPercent(document),
        updatedAt,
        lastViewedAt,
        tags: resolveDisplayTags(document, categoryLabel, folderPath, tagById),
        orderIndex: Number(document.orderIndex) || 0,
      } satisfies PdfLibraryRow;
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
