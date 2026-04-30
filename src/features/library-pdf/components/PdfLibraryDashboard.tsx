
import { useEffect, useMemo, useState } from "react";

import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import { normalizeDate } from "@/shared/codec/date";
import type { DocumentItem, Folder } from "@/types";

type PdfLibraryDashboardProps = {
  documents: DocumentItem[];
  folders: Folder[];
  onOpenDocument: (documentId: string) => void;
};

type PdfDashboardRow = {
  id: string;
  title: string;
  fileName: string;
  folderId: string;
  folderPathLabel: string;
  storagePathLabel: string;
  categoryLabel: string;
  pageCount: number | null;
  currentPage: number | null;
  progressPercent: number | null;
  updatedAt: Date | null;
  lastViewedAt: Date | null;
  tagLabels: string[];
  orderIndex: number;
};

type FolderSummaryItem = {
  label: string;
  count: number;
};

type RelatedPdfItem = PdfDashboardRow & {
  relatedScore: number;
};

type ViewerStateWithLastOpenedAt = NonNullable<DocumentItem["viewerState"]> & {
  lastOpenedAt?: unknown;
};

const PAGE_SIZE = 10;

const resolveFolderName = (folder: Folder | undefined): string => {
  return folder?.folderName?.trim() || "未分類";
};

const toDate = (value: unknown): Date | null => {
  return normalizeDate(value);
};

const formatDateTime = (value: Date | null): string => {
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

const formatPageCount = (value: number | null): string => {
  if (!value || value <= 0) {
    return "—";
  }

  return String(value);
};

const clampProgress = (value: number): number => {
  return Math.max(0, Math.min(100, Math.round(value)));
};

const resolveCurrentPage = (document: DocumentItem): number | null => {
  const currentPage = document.viewerState?.currentPage;
  if (typeof currentPage !== "number" || !Number.isFinite(currentPage)) {
    return null;
  }

  if (currentPage <= 0) {
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

  return clampProgress((currentPage / pageCount) * 100);
};

const buildFolderPath = (
  folderId: string,
  folderById: Map<string, Folder>,
): string[] => {
  const visited = new Set<string>();
  const path: string[] = [];
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

const resolveTagLabels = (
  document: DocumentItem,
  tagById: ReadonlyMap<string, { name: string }>,
): string[] => {
  const tags = Array.isArray(document.tags) ? document.tags : [];

  return tags
    .map((tagIdOrName) => tagById.get(tagIdOrName)?.name ?? tagIdOrName)
    .filter((label): label is string => typeof label === "string" && label.trim().length > 0);
};

const countSharedTags = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  return left.reduce((count, tag) => count + Number(rightSet.has(tag)), 0);
};

const buildFolderSummaries = (rows: PdfDashboardRow[]): FolderSummaryItem[] => {
  const bucketMap = new Map<string, number>();

  rows.forEach((row) => {
    bucketMap.set(row.categoryLabel, (bucketMap.get(row.categoryLabel) ?? 0) + 1);
  });

  return Array.from(bucketMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.label.localeCompare(right.label, "ja");
    })
    .slice(0, 3);
};

const buildRelatedRows = (
  rows: PdfDashboardRow[],
  selectedRow: PdfDashboardRow | null,
): RelatedPdfItem[] => {
  if (!selectedRow) {
    return [];
  }

  return rows
    .filter((row) => row.id !== selectedRow.id)
    .map((row) => {
      const sharedTags = countSharedTags(row.tagLabels, selectedRow.tagLabels);
      const sameFolder = Number(row.folderId === selectedRow.folderId);
      const score = sameFolder * 100 + sharedTags * 10 + Number(Boolean(row.progressPercent));

      return {
        ...row,
        relatedScore: score,
      };
    })
    .filter((row) => row.relatedScore > 0)
    .sort((left, right) => {
      if (right.relatedScore !== left.relatedScore) {
        return right.relatedScore - left.relatedScore;
      }

      return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0);
    })
    .slice(0, 4);
};

const SummaryChip = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => {
  return (
    <div className="flex items-center justify-between rounded-[4px] bg-[#f6f8f7] px-3 py-2">
      <span className="truncate text-[12px] font-medium text-slate-500">{label}</span>
      <span className="ml-3 text-[13px] font-semibold text-slate-700">{value}</span>
    </div>
  );
};

const Pill = ({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "green" | "violet";
}) => {
  const toneClassName =
    tone === "green"
      ? "bg-[#edf6f1] text-[#4f8061]"
      : tone === "violet"
        ? "bg-[#f0edfb] text-[#6f60ad]"
        : "bg-slate-100 text-slate-600";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        toneClassName,
      )}
    >
      {label}
    </span>
  );
};

const EmptyValue = ({ label }: { label: string }) => {
  return <span className="text-slate-400">{label}</span>;
};

const PdfLibraryDashboard = ({
  documents,
  folders,
  onOpenDocument,
}: PdfLibraryDashboardProps) => {
  const { tagById } = useTags();
  const [unusedExpandedFolders, setUnusedExpandedFolders] = useState<Set<string>>(new Set());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);

  void unusedExpandedFolders;

  const folderById = useMemo(() => {
    return new Map(folders.map((folder) => [folder.id, folder]));
  }, [folders]);

  const rows = useMemo<PdfDashboardRow[]>(() => {
    return documents
      .filter((document) => document.kind === "pdf")
      .map((document) => {
        const folderPath = buildFolderPath(document.folderId, folderById);
        const folderPathLabel = folderPath.join(" / ") || "未分類";
        const storagePathLabel = ["ライブラリ", "PDF", ...folderPath].join(" / ");
        const viewerState = (document.viewerState ?? null) as ViewerStateWithLastOpenedAt | null;
        const updatedAt = toDate(document.updatedAt);
        const lastViewedAt = toDate(viewerState?.lastOpenedAt);
        const currentPage = resolveCurrentPage(document);

        return {
          id: document.id,
          title: document.title?.trim() || document.fileName?.trim() || "無題のPDF",
          fileName: document.fileName?.trim() || document.title?.trim() || "無題のPDF",
          folderId: document.folderId,
          folderPathLabel,
          storagePathLabel,
          categoryLabel: resolveCategoryLabel(document.folderId, folderById),
          pageCount: document.pageCount ?? null,
          currentPage,
          progressPercent: resolveProgressPercent(document),
          updatedAt,
          lastViewedAt,
          tagLabels: resolveTagLabels(document, tagById),
          orderIndex: Number(document.orderIndex) || 0,
        };
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
  }, [documents, folderById, tagById]);

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedDocumentId(null);
      setPageIndex(0);
      return;
    }

    setSelectedDocumentId((currentSelectedDocumentId) => {
      if (currentSelectedDocumentId && rows.some((row) => row.id === currentSelectedDocumentId)) {
        return currentSelectedDocumentId;
      }

      return rows[0]?.id ?? null;
    });
  }, [rows]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex((currentPageIndex) => {
      if (pageCount === 0) {
        return 0;
      }

      return Math.max(0, Math.min(currentPageIndex, pageCount - 1));
    });
  }, [pageCount]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    const selectedIndex = rows.findIndex((row) => row.id === selectedDocumentId);
    if (selectedIndex === -1) {
      return;
    }

    const nextPageIndex = Math.floor(selectedIndex / PAGE_SIZE);
    setPageIndex((currentPageIndex) =>
      currentPageIndex === nextPageIndex ? currentPageIndex : nextPageIndex,
    );
  }, [rows, selectedDocumentId]);

  const selectedRow = useMemo(() => {
    if (!selectedDocumentId) {
      return null;
    }

    return rows.find((row) => row.id === selectedDocumentId) ?? null;
  }, [rows, selectedDocumentId]);

  const importTargetFolderId =
    selectedRow?.folderId ?? rows[0]?.folderId ?? folders[0]?.id ?? null;

  const importTargetFolderPathLabel = useMemo(() => {
    if (!importTargetFolderId) {
      return "インポート先がありません";
    }

    const folderPath = buildFolderPath(importTargetFolderId, folderById);
    return folderPath.join(" / ") || "未分類";
  }, [folderById, importTargetFolderId]);

  const getNextOrderIndex = (folderId: string | null): number => {
    if (!folderId) {
      return 0;
    }

    const maxOrderIndex = documents
      .filter((document) => document.kind === "pdf" && document.folderId === folderId)
      .reduce((currentMax, document) => {
        return Math.max(currentMax, Number(document.orderIndex) || 0);
      }, -1);

    return maxOrderIndex + 1;
  };

  const {
    fileInputRef,
    handleToolbarAddDocument,
    currentFileAccept,
    handleToolbarFileInputChange,
  } = useFolderDocumentUpload({
    actionFolderId: importTargetFolderId,
    getNextOrderIndex,
    setExpandedFolders: setUnusedExpandedFolders,
  });

  const folderSummaries = useMemo(() => buildFolderSummaries(rows), [rows]);

  const continueReadingRows = useMemo(() => {
    return rows
      .filter((row) => {
        const progressPercent = row.progressPercent ?? 0;
        return progressPercent > 0 && progressPercent < 100;
      })
      .sort((left, right) => {
        const rightTime = right.lastViewedAt?.getTime() ?? right.updatedAt?.getTime() ?? 0;
        const leftTime = left.lastViewedAt?.getTime() ?? left.updatedAt?.getTime() ?? 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return (right.progressPercent ?? 0) - (left.progressPercent ?? 0);
      })
      .slice(0, 3);
  }, [rows]);

  const recentRows = useMemo(() => {
    return [...rows]
      .sort((left, right) => {
        return (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0);
      })
      .slice(0, 3);
  }, [rows]);

  const relatedRows = useMemo(() => buildRelatedRows(rows, selectedRow), [rows, selectedRow]);

  const paginatedRows = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [pageIndex, rows]);

  const visibleStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const visibleEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#fbfcfb] p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept={currentFileAccept}
          multiple
          className="hidden"
          onChange={handleToolbarFileInputChange}
        />
        <div className="w-full max-w-xl rounded-[4px] border border-[#e6ebe7] bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
          <div className="inline-flex items-center rounded-full bg-[#edf6f1] px-3 py-1 text-[12px] font-semibold text-[#4f8061]">
            PDF ライブラリ
          </div>
          <h2 className="mt-5 text-[28px] font-semibold tracking-[-0.02em] text-slate-800">
            PDF がまだありません
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-slate-500">
            まずは PDF を取り込んでライブラリを作成してください。取り込んだ PDF はここに一覧表示され、
            続きから読む・最近更新した PDF・詳細パネルまで一気に管理できます。
          </p>
          <div className="mt-8 flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-[4px] border border-[#7aa78c] px-5 py-3 text-[14px] font-semibold text-[#4f8061] transition-colors hover:bg-[#f5faf7]"
              disabled={!importTargetFolderId}
              onClick={handleToolbarAddDocument}
            >
              PDF をインポート
            </button>
            <span className="text-[12px] text-slate-400">
              {folders.length > 0
                ? `インポート先: ${resolveFolderName(folders[0])}`
                : "先に保存先フォルダを作成してください"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full bg-[#fbfcfb]">
      <input
        ref={fileInputRef}
        type="file"
        accept={currentFileAccept}
        multiple
        className="hidden"
        onChange={handleToolbarFileInputChange}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col px-5 pb-5 pt-5">
        <div className="grid shrink-0 grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-[4px] border border-[#e6ebe7] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[14px] font-semibold text-slate-700">PDF の概要</p>
                <div className="mt-4 flex items-end gap-3">
                  <span className="text-[54px] font-semibold leading-none tracking-[-0.04em] text-slate-900">
                    {rows.length}
                  </span>
                  <span className="pb-1 text-[14px] text-slate-500">総 PDF 数</span>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              {folderSummaries.map((summary, index) => (
                <SummaryChip
                  key={`${summary.label}:${index}`}
                  label={summary.label}
                  value={summary.count}
                />
              ))}
            </div>
          </section>

          <section className="rounded-[4px] border border-[#e6ebe7] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-slate-700">続きから読む</p>
              <span className="text-[12px] font-semibold text-[#5b8a6e]">上位 3 件</span>
            </div>

            <div className="mt-4 space-y-4">
              {continueReadingRows.length > 0 ? (
                continueReadingRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={cn(
                      "block w-full rounded-[4px] border px-3 py-3 text-left transition-colors",
                      selectedRow?.id === row.id
                        ? "border-[#cfe2d6] bg-[#f7fbf8]"
                        : "border-transparent bg-[#fafbfa] hover:border-[#e3ece6]",
                    )}
                    onClick={() => setSelectedDocumentId(row.id)}
                  >
                    <div className="truncate text-[14px] font-medium text-slate-800">{row.title}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#7aa78c]"
                          style={{ width: `${row.progressPercent ?? 0}%` }}
                        />
                      </div>
                      <span className="text-[12px] font-semibold text-slate-500">
                        {row.progressPercent ?? 0}%
                      </span>
                    </div>
                    <div className="mt-2 text-[12px] text-slate-400">
                      {row.currentPage ? `P.${row.currentPage} まで閲覧` : "閲覧位置なし"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-[4px] bg-[#fafbfa] px-4 py-6 text-[13px] text-slate-400">
                  続きから読める PDF はまだありません。
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[4px] border border-[#e6ebe7] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-slate-700">最近更新した PDF</p>
              <span className="text-[12px] font-semibold text-[#5b8a6e]">最新順</span>
            </div>

            <div className="mt-4 space-y-3">
              {recentRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "flex w-full items-start justify-between gap-4 rounded-[4px] border px-3 py-3 text-left transition-colors",
                    selectedRow?.id === row.id
                      ? "border-[#cfe2d6] bg-[#f7fbf8]"
                      : "border-transparent bg-[#fafbfa] hover:border-[#e3ece6]",
                  )}
                  onClick={() => setSelectedDocumentId(row.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium text-slate-800">{row.title}</div>
                    <div className="mt-1 truncate text-[12px] text-slate-400">{row.folderPathLabel}</div>
                  </div>
                  <div className="shrink-0 text-[12px] font-medium text-slate-500">
                    {formatDateTime(row.updatedAt)}
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[4px] border border-[#e6ebe7] bg-white shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left">
              <thead>
                <tr className="border-b border-[#eef2ef]">
                  <th className="whitespace-nowrap px-5 py-4 text-[12px] font-semibold text-slate-500">
                    名前
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-500">
                    タグ
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-500">
                    場所
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-500">
                    ページ
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-500">
                    最終閲覧
                  </th>
                  <th className="whitespace-nowrap px-4 py-4 text-[12px] font-semibold text-slate-500">
                    更新日時
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedRow?.id === row.id ? "bg-[#f8fbf9]" : "hover:bg-[#fafcfb]",
                    )}
                    onClick={() => setSelectedDocumentId(row.id)}
                    onDoubleClick={() => onOpenDocument(row.id)}
                  >
                    <td className="border-t border-[#eef2ef] px-5 py-4">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium text-slate-800">{row.title}</div>
                        <div className="mt-1 truncate text-[12px] text-slate-400">{row.fileName}</div>
                      </div>
                    </td>
                    <td className="border-t border-[#eef2ef] px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {row.tagLabels.length > 0 ? (
                          row.tagLabels.slice(0, 3).map((tagLabel, index) => (
                            <Pill
                              key={`${row.id}:${tagLabel}:${index}`}
                              label={tagLabel}
                              tone={index % 2 === 0 ? "violet" : "green"}
                            />
                          ))
                        ) : (
                          <EmptyValue label="タグなし" />
                        )}
                        {row.tagLabels.length > 3 ? (
                          <Pill label={`+${row.tagLabels.length - 3}`} />
                        ) : null}
                      </div>
                    </td>
                    <td className="border-t border-[#eef2ef] px-4 py-4 text-[13px] text-slate-500">
                      <span className="truncate">{row.storagePathLabel}</span>
                    </td>
                    <td className="border-t border-[#eef2ef] px-4 py-4 text-[13px] font-medium text-slate-600">
                      {formatPageCount(row.pageCount)}
                    </td>
                    <td className="border-t border-[#eef2ef] px-4 py-4 text-[13px] text-slate-500">
                      {formatDateTime(row.lastViewedAt)}
                    </td>
                    <td className="border-t border-[#eef2ef] px-4 py-4 text-[13px] text-slate-500">
                      {formatDateTime(row.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#eef2ef] px-5 py-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5ebe7] text-slate-500 transition-colors hover:bg-[#f7fbf8] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={pageIndex <= 0}
                onClick={() => setPageIndex((currentPageIndex) => Math.max(0, currentPageIndex - 1))}
              >
                ‹
              </button>
              {Array.from({ length: pageCount }).map((_, index) => (
                <button
                  key={index}
                  type="button"
                  className={cn(
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-[4px] px-3 text-[13px] font-medium transition-colors",
                    index === pageIndex
                      ? "bg-[#eef6f0] text-[#4f8061]"
                      : "text-slate-500 hover:bg-[#f7fbf8]",
                  )}
                  onClick={() => setPageIndex(index)}
                >
                  {index + 1}
                </button>
              ))}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[4px] border border-[#e5ebe7] text-slate-500 transition-colors hover:bg-[#f7fbf8] disabled:cursor-not-allowed disabled:opacity-40"
                disabled={pageIndex >= pageCount - 1}
                onClick={() =>
                  setPageIndex((currentPageIndex) =>
                    Math.min(pageCount - 1, currentPageIndex + 1),
                  )
                }
              >
                ›
              </button>
            </div>

            <div className="text-[13px] text-slate-400">
              {visibleStart}–{visibleEnd} / {rows.length} 件
            </div>
          </div>
        </section>
      </div>

      <aside className="flex h-full w-[340px] shrink-0 flex-col border-l border-[#e6ebe7] bg-white p-5">
        {selectedRow ? (
          <>
            <section className="rounded-[4px] border border-[#e6ebe7] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] bg-[#fff3f1] text-[12px] font-bold text-[#d56f60]">
                  PDF
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-slate-700">PDF の詳細</p>
                  <div className="mt-2 max-h-[3.5rem] overflow-hidden text-[20px] font-semibold leading-7 tracking-[-0.02em] text-slate-900">
                    {selectedRow.title}
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-slate-500">カテゴリ</span>
                  <Pill label={selectedRow.categoryLabel} tone="violet" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-slate-500">ページ数</span>
                  <span className="text-[14px] font-semibold text-slate-700">
                    {formatPageCount(selectedRow.pageCount)}
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="text-[13px] text-slate-500">タグ</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedRow.tagLabels.length > 0 ? (
                      selectedRow.tagLabels.map((tagLabel, index) => (
                        <Pill
                          key={`${selectedRow.id}:${tagLabel}:${index}`}
                          label={tagLabel}
                          tone={index % 2 === 0 ? "violet" : "green"}
                        />
                      ))
                    ) : (
                      <EmptyValue label="タグなし" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-slate-500">閲覧位置</span>
                  <span className="text-[14px] font-semibold text-slate-700">
                    {selectedRow.currentPage ? `P.${selectedRow.currentPage}` : "未記録"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-slate-500">最終閲覧</span>
                  <span className="text-right text-[13px] text-slate-600">
                    {formatDateTime(selectedRow.lastViewedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-slate-500">更新日</span>
                  <span className="text-right text-[13px] text-slate-600">
                    {formatDateTime(selectedRow.updatedAt)}
                  </span>
                </div>
                <div className="space-y-2">
                  <span className="text-[13px] text-slate-500">保存先</span>
                  <div className="rounded-[4px] bg-[#f7faf8] px-3 py-3 text-[13px] leading-6 text-slate-600">
                    {selectedRow.storagePathLabel}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[4px] border border-[#7aa78c] text-[14px] font-semibold text-[#4f8061] transition-colors hover:bg-[#f5faf7]"
                onClick={() => onOpenDocument(selectedRow.id)}
              >
                PDF を開く
              </button>
            </section>

            <section className="mt-4 rounded-[4px] border border-[#e6ebe7] bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-slate-700">関連 PDF</p>
                <span className="text-[12px] font-semibold text-[#5b8a6e]">おすすめ</span>
              </div>

              <div className="mt-4 space-y-2">
                {relatedRows.length > 0 ? (
                  relatedRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-[4px] px-3 py-3 text-left transition-colors hover:bg-[#f7fbf8]"
                      onClick={() => setSelectedDocumentId(row.id)}
                    >
                      <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f1eefb] text-[10px] font-bold text-[#6f60ad]">
                        PDF
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-medium text-slate-700">
                          {row.title}
                        </span>
                        <span className="mt-1 block truncate text-[12px] text-slate-400">
                          {row.folderPathLabel}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[4px] bg-[#fafbfa] px-4 py-5 text-[13px] text-slate-400">
                    関連 PDF はまだ見つかりません。
                  </div>
                )}
              </div>
            </section>
          </>
        ) : null}

        <div className="mt-auto rounded-[4px] border border-[#cfe2d6] bg-[#fcfffd] p-5 shadow-[0_14px_40px_rgba(15,23,42,0.04)]">
          <div className="text-[13px] text-slate-500">インポート先</div>
          <div className="mt-2 text-[14px] font-semibold leading-6 text-slate-700">
            {importTargetFolderPathLabel}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-[4px] border border-[#7aa78c] text-[14px] font-semibold text-[#4f8061] transition-colors hover:bg-[#f5faf7] disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!importTargetFolderId}
            onClick={handleToolbarAddDocument}
          >
            PDF をインポート
          </button>
        </div>
      </aside>
    </div>
  );
};

export { PdfLibraryDashboard };
