import type { DocumentItem, Folder } from "@/types";
import { normalizeDate } from "@/utils/codec/date";



type PdfDashboardRow = {
  id: string; title: string; fileName: string; folderId: string; categoryLabel: string; folderPathLabel: string; storagePathLabel: string; pageCount: number | null; currentPage: number | null; progressPercent: number | null; updatedAt: Date | null; lastViewedAt: Date | null; tags: string[]; orderIndex: number };
type ViewerStateWithLastOpenedAt = NonNullable<DocumentItem["viewerState"]> & { lastOpenedAt?: unknown };
type BuildPdfDashboardRowsParams = {
  documents: DocumentItem[]; folders: Folder[]; tagById: ReadonlyMap<string, { name: string }> };



const toDate = (value: unknown): Date | null => normalizeDate(value);
const resolveFolderName = (folder: Folder | undefined): string => folder?.folderName?.trim() ?? "未分類";
const resolveFolderPathLabel = (folderPath: string[]): string => folderPath.length > 0 ? folderPath.join(" / ") : "未分類";
const resolveOrderIndex = (value: unknown): number => {
  const orderIndex = Number(value);
  return Number.isFinite(orderIndex) ? orderIndex : 0;
};
const resolveNonEmptyText = (...values: Array<string | null | undefined>): string | null => {
  const resolved = values.map((value) => value?.trim() ?? "").find((value) => value.length > 0);
  return resolved ?? null;
};
const resolveCurrentPage = (document: DocumentItem): number | null => {
  const currentPage = document.viewerState?.currentPage;
  if (typeof currentPage !== "number" || !Number.isFinite(currentPage) || currentPage <= 0) return null;
  return Math.floor(currentPage);
};
const resolveProgressPercent = (document: DocumentItem): number | null => {
  const currentPage = resolveCurrentPage(document);
  const pageCount = document.pageCount ?? null;
  if (!currentPage || !pageCount || pageCount <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((currentPage / pageCount) * 100)));
};
const buildFolderPath = (folderId: string, folderById: Map<string, Folder>): string[] => {
  const path: string[] = [];
  const visited = new Set<string>();
  let currentFolderId: string | null | undefined = folderId;
  while (currentFolderId && !visited.has(currentFolderId)) {
    const folder = folderById.get(currentFolderId);
    if (!folder) break;
    path.unshift(resolveFolderName(folder));
    visited.add(currentFolderId);
    currentFolderId = folder.parentFolderId ?? null;
  }
  return path;
};
const resolveCategoryLabel = (folderId: string, folderById: Map<string, Folder>): string => {
  const path = buildFolderPath(folderId, folderById);
  return path[0] ?? "未分類";
};
const resolveDisplayTags = (document: DocumentItem, tagById: ReadonlyMap<string, { name: string }>): string[] => {
  const explicitTags = (Array.isArray(document.tags) ? document.tags : [])
    .map((tagIdOrName) => tagById.get(tagIdOrName)?.name ?? tagIdOrName)
    .filter((label): label is string => typeof label === "string" && label.trim().length > 0);
  return Array.from(new Set(explicitTags)).slice(0, 3);
};
const buildPdfDashboardRows = ({ documents, folders, tagById }: BuildPdfDashboardRowsParams): PdfDashboardRow[] => {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  return documents
    .filter((document) => document.kind === "pdf")
    .map((document) => {
      const folderPath = buildFolderPath(document.folderId, folderById);
      const categoryLabel = resolveCategoryLabel(document.folderId, folderById);
      const viewerState = (document.viewerState ?? null) as ViewerStateWithLastOpenedAt | null;
      const updatedAt = toDate(document.updatedAt);
      const lastViewedAt = toDate(viewerState?.lastOpenedAt);
      const displayName = resolveNonEmptyText(document.title, document.fileName) ?? "無題のPDF";
      const fileName = resolveNonEmptyText(document.fileName, document.title) ?? "無題のPDF";
      return {
        id: document.id,
        title: displayName,
        fileName,
        folderId: document.folderId,
        categoryLabel,
        folderPathLabel: resolveFolderPathLabel(folderPath),
        storagePathLabel: ["ライブラリ", "PDF", ...folderPath].join(" / "),
        pageCount: document.pageCount ?? null,
        currentPage: resolveCurrentPage(document),
        progressPercent: resolveProgressPercent(document),
        updatedAt,
        lastViewedAt,
        tags: resolveDisplayTags(document, tagById),
        orderIndex: resolveOrderIndex(document.orderIndex),
      } satisfies PdfDashboardRow;
    })
    .sort((left, right) => {
      const rightTime = right.updatedAt?.getTime() ?? 0;
      const leftTime = left.updatedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
      if (right.orderIndex !== left.orderIndex) return right.orderIndex - left.orderIndex;
      return left.title.localeCompare(right.title, "ja");
    });
};



export { buildPdfDashboardRows };


export type { PdfDashboardRow };
