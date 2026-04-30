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

type SummaryCategory = {
  label: string;
  count: number;
  tone: "violet" | "blue" | "green";
};

type RelatedRow = PdfDashboardRow & {
  score: number;
};

const PAGE_SIZE = 10;

const toneByIndex = ["violet", "blue", "green"] as const;

const toDate = (value: unknown): Date | null => {
  return normalizeDate(value);
};

const resolveFolderName = (folder: Folder | undefined): string => {
  return folder?.folderName?.trim() || "未分類";
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

const formatDateShort = (value: Date | null): string => {
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

const buildSummaryCategories = (rows: PdfDashboardRow[]): SummaryCategory[] => {
  const bucketMap = new Map<string, number>();

  rows.forEach((row) => {
    bucketMap.set(
      row.categoryLabel,
      (bucketMap.get(row.categoryLabel) ?? 0) + 1,
    );
  });

  return Array.from(bucketMap.entries())
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }

      return left[0].localeCompare(right[0], "ja");
    })
    .slice(0, 3)
    .map(([label, count], index) => ({
      label,
      count,
      tone: toneByIndex[index] ?? "green",
    }));
};

const countSharedTags = (left: string[], right: string[]): number => {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const rightSet = new Set(right);
  return left.reduce((count, tag) => count + Number(rightSet.has(tag)), 0);
};

const buildRelatedRows = (
  rows: PdfDashboardRow[],
  selectedRow: PdfDashboardRow | null,
): RelatedRow[] => {
  if (!selectedRow) {
    return [];
  }

  return rows
    .filter((row) => row.id !== selectedRow.id)
    .map((row) => ({
      ...row,
      score:
        Number(row.folderId === selectedRow.folderId) * 100 +
        countSharedTags(row.tags, selectedRow.tags) * 10 +
        Number(Boolean(row.progressPercent)),
    }))
    .filter((row) => row.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (
        (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0)
      );
    })
    .slice(0, 4);
};

const cardClassName = "rounded-[16px] border border-[#e5e7eb] bg-[#FFFFFF] p-4";

const IconBadge = ({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "green" | "violet" | "blue" | "rose";
}) => {
  const toneClassName =
    tone === "green"
      ? "bg-[#f3f4f6] text-[#4b5563]"
      : tone === "violet"
        ? "bg-[#f5f3ff] text-[#6d5ab3]"
        : tone === "blue"
          ? "bg-[#eff6ff] text-[#446a9b]"
          : tone === "rose"
            ? "bg-[#fff1f2] text-[#c06268]"
            : "bg-[#f3f4f6] text-[#6b7280]";

  return (
    <span
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-[999px] text-[12px] font-semibold",
        toneClassName,
      )}
    >
      {label}
    </span>
  );
};

const TagChip = ({
  label,
  tone = "green",
}: {
  label: string;
  tone?: "green" | "violet" | "blue" | "slate";
}) => {
  const toneClassName =
    tone === "green"
      ? "bg-[#f3f4f6] text-[#4b5563]"
      : tone === "violet"
        ? "bg-[#f5f3ff] text-[#6d5ab3]"
        : tone === "blue"
          ? "bg-[#eff6ff] text-[#446a9b]"
          : "bg-[#f3f4f6] text-[#6b7280]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[999px] px-2.5 py-1 text-[11px] font-semibold leading-none",
        toneClassName,
      )}
    >
      {label}
    </span>
  );
};

const KeyValueRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] items-start gap-3 text-[13px] leading-5">
      <span className="text-[#7a867f]">{label}</span>
      <div className="min-w-0 text-right font-medium text-[#48524f]">
        {value}
      </div>
    </div>
  );
};

const EmptyText = ({ label }: { label: string }) => {
  return <span className="text-[#9aa49f]">{label}</span>;
};

const PdfLibraryDashboard = ({
  documents,
  folders,
  onOpenDocument,
}: PdfLibraryDashboardProps) => {
  const { tagById } = useTags();
  const [unusedExpandedFolders, setUnusedExpandedFolders] = useState<
    Set<string>
  >(new Set());
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
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
        const categoryLabel = resolveCategoryLabel(
          document.folderId,
          folderById,
        );
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
          tags: resolveDisplayTags(
            document,
            categoryLabel,
            folderPath,
            tagById,
          ),
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

    setSelectedDocumentId((currentValue) => {
      if (currentValue && rows.some((row) => row.id === currentValue)) {
        return currentValue;
      }

      return rows[0]?.id ?? null;
    });
  }, [rows]);

  const totalPageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  useEffect(() => {
    setPageIndex((currentValue) =>
      Math.max(0, Math.min(currentValue, totalPageCount - 1)),
    );
  }, [totalPageCount]);

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    const selectedIndex = rows.findIndex(
      (row) => row.id === selectedDocumentId,
    );
    if (selectedIndex === -1) {
      return;
    }

    const nextPageIndex = Math.floor(selectedIndex / PAGE_SIZE);
    setPageIndex((currentValue) =>
      currentValue === nextPageIndex ? currentValue : nextPageIndex,
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

  const getNextOrderIndex = (folderId: string | null): number => {
    if (!folderId) {
      return 0;
    }

    return (
      documents
        .filter(
          (document) =>
            document.kind === "pdf" && document.folderId === folderId,
        )
        .reduce(
          (currentMax, document) =>
            Math.max(currentMax, Number(document.orderIndex) || 0),
          -1,
        ) + 1
    );
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

  const summaryCategories = useMemo(() => buildSummaryCategories(rows), [rows]);

  const continueRows = useMemo(() => {
    return rows
      .filter((row) => {
        const progress = row.progressPercent ?? 0;
        return progress > 0 && progress < 100;
      })
      .sort((left, right) => {
        const rightTime =
          right.lastViewedAt?.getTime() ?? right.updatedAt?.getTime() ?? 0;
        const leftTime =
          left.lastViewedAt?.getTime() ?? left.updatedAt?.getTime() ?? 0;

        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }

        return (right.progressPercent ?? 0) - (left.progressPercent ?? 0);
      })
      .slice(0, 3);
  }, [rows]);

  const recentRows = useMemo(() => {
    return [...rows]
      .sort(
        (left, right) =>
          (right.updatedAt?.getTime() ?? 0) - (left.updatedAt?.getTime() ?? 0),
      )
      .slice(0, 3);
  }, [rows]);

  const relatedRows = useMemo(
    () => buildRelatedRows(rows, selectedRow),
    [rows, selectedRow],
  );

  const paginatedRows = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [pageIndex, rows]);

  const visibleStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const visibleEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#FFFFFF] p-8">
        <input
          ref={fileInputRef}
          type="file"
          accept={currentFileAccept}
          multiple
          className="hidden"
          onChange={handleToolbarFileInputChange}
        />
        <div className="w-full max-w-2xl rounded-[16px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
          <div className="inline-flex rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
            PDF ライブラリ
          </div>
          <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
            PDF がまだありません
          </h2>
          <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
            PDF
            を取り込むと、この画面で概要カード・一覧テーブル・詳細パネルをまとめて管理できます。
          </p>
          <button
            type="button"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF] px-5 text-[14px] font-semibold text-[#111827] hover:bg-[#f9fafb]"
            onClick={handleToolbarAddDocument}
          >
            PDF をインポート
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full bg-[#FFFFFF]">
      <input
        ref={fileInputRef}
        type="file"
        accept={currentFileAccept}
        multiple
        className="hidden"
        onChange={handleToolbarFileInputChange}
      />

      <div className="grid min-h-0 w-full grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <section className={cardClassName}>
              <div className="flex items-start justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <IconBadge label="PDF" tone="green" />
                    <span className="text-[13px] font-semibold text-[#30403d]">
                      PDFの概要
                    </span>
                  </div>
                  <div className="mt-4 flex items-end gap-3">
                    <span className="text-[60px] font-semibold leading-none tracking-[-0.05em] text-[#17234a]">
                      {rows.length}
                    </span>
                    <span className="pb-1 text-[14px] text-[#77847d]">
                      総PDF数
                    </span>
                  </div>
                </div>

                <div className="min-w-[130px] space-y-2.5 pt-1">
                  {summaryCategories.map((summary, index) => (
                    <div
                      key={`${summary.label}:${index}`}
                      className="flex items-center justify-between gap-3"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <IconBadge
                          label={String(summary.count)}
                          tone={summary.tone}
                        />
                        <span className="truncate text-[13px] font-medium text-[#55635f]">
                          {summary.label}
                        </span>
                      </div>
                      <span className="text-[13px] font-semibold text-[#41504d]">
                        {summary.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className={cardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IconBadge label="読" tone="green" />
                  <span className="text-[13px] font-semibold text-[#30403d]">
                    続きから読む
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-[#6b7280]">
                  すべて見る
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {continueRows.length > 0 ? (
                  continueRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      className="flex w-full items-start gap-3 text-left"
                      onClick={() => setSelectedDocumentId(row.id)}
                    >
                      <IconBadge label="PDF" tone="rose" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-semibold leading-5 text-[#29343b]">
                          {row.title}
                        </div>
                        <div className="mt-2 h-[6px] overflow-hidden rounded-[999px] bg-[#e5e7eb]">
                          <div
                            className="h-full rounded-[999px] bg-[#4b5563]"
                            style={{ width: `${row.progressPercent ?? 0}%` }}
                          />
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2 text-[12px] text-[#7d8784]">
                          <span className="truncate">
                            最終閲覧: {formatDateTime(row.lastViewedAt)}
                          </span>
                          <span className="font-semibold text-[#5f6f69]">
                            {row.progressPercent ?? 0}%
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[16px] bg-[#f8fafc] px-4 py-5 text-[13px] leading-6 text-[#94a09a]">
                    続きから読める PDF はまだありません。
                  </div>
                )}
              </div>
            </section>

            <section className={cardClassName}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <IconBadge label="更" tone="green" />
                  <span className="text-[13px] font-semibold text-[#30403d]">
                    最近更新したPDF
                  </span>
                </div>
                <span className="text-[12px] font-semibold text-[#6b7280]">
                  すべて見る
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {recentRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => setSelectedDocumentId(row.id)}
                  >
                    <IconBadge label="PDF" tone="rose" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold leading-5 text-[#29343b]">
                        {row.title}
                      </div>
                      <div className="mt-1 text-[12px] text-[#7d8784]">
                        {formatDateShort(row.updatedAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <section className="min-h-0 flex-1 rounded-[16px] border border-[#e5e7eb] bg-[#FFFFFF]">
            <div className="overflow-hidden">
              <div className="grid grid-cols-[minmax(240px,1.9fr)_minmax(160px,1fr)_80px_120px_120px_32px] gap-4 border-b border-[#e5e7eb] px-4 py-3 text-[12px] font-semibold text-[#58635f]">
                <div>名前</div>
                <div>タグ</div>
                <div>ページ</div>
                <div>最終閲覧</div>
                <div>更新日時</div>
                <div>…</div>
              </div>

              <div className="divide-y divide-[#eef0f3]">
                {paginatedRows.map((row) => {
                  const isSelected = row.id === selectedRow?.id;

                  return (
                    <button
                      key={row.id}
                      type="button"
                      className={cn(
                        "grid w-full grid-cols-[minmax(240px,1.9fr)_minmax(160px,1fr)_80px_120px_120px_32px] gap-4 px-4 py-3 text-left transition-colors",
                        isSelected ? "bg-[#f9fafb]" : "hover:bg-[#fafafa]",
                      )}
                      onClick={() => setSelectedDocumentId(row.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <IconBadge label="PDF" tone="rose" />
                          <span className="truncate text-[13px] font-semibold text-[#273038]">
                            {row.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {row.tags.length > 0 ? (
                          row.tags
                            .slice(0, 2)
                            .map((tag, index) => (
                              <TagChip
                                key={`${row.id}:${tag}:${index}`}
                                label={tag}
                                tone={index % 2 === 0 ? "violet" : "green"}
                              />
                            ))
                        ) : (
                          <span className="text-[13px] text-[#93a09a]">
                            タグなし
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] font-medium text-[#46514f]">
                        {formatPageCount(row.pageCount)}
                      </div>
                      <div className="text-[13px] text-[#75817c]">
                        {formatDateTime(row.lastViewedAt)}
                      </div>
                      <div className="text-[13px] text-[#75817c]">
                        {formatDateTime(row.updatedAt)}
                      </div>
                      <div className="text-[18px] leading-none text-[#9aa59e]">
                        …
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#e5e7eb] px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-[#FFFFFF] text-[#8c9690] disabled:opacity-40"
                  disabled={pageIndex === 0}
                  onClick={() =>
                    setPageIndex((currentValue) =>
                      Math.max(0, currentValue - 1),
                    )
                  }
                >
                  ‹
                </button>
                <div className="inline-flex h-8 min-w-[40px] items-center justify-center rounded-[16px] bg-[#f3f4f6] px-3 text-[13px] font-semibold text-[#374151]">
                  {pageIndex + 1}
                </div>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-[16px] border border-[#e5e7eb] bg-[#FFFFFF] text-[#8c9690] disabled:opacity-40"
                  disabled={pageIndex >= totalPageCount - 1}
                  onClick={() =>
                    setPageIndex((currentValue) =>
                      Math.min(totalPageCount - 1, currentValue + 1),
                    )
                  }
                >
                  ›
                </button>
              </div>

              <div className="text-[13px] text-[#8c9690]">
                {visibleStart}–{visibleEnd} / {rows.length} 件
              </div>
            </div>
          </section>
        </div>

        <aside className="flex min-h-0 min-w-0 flex-col gap-4">
          <section className={cardClassName}>
            <div className="flex items-start gap-3">
              <IconBadge label="PDF" tone="rose" />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#30403d]">
                  PDFの詳細
                </div>
                <div className="mt-3 break-words text-[18px] font-semibold leading-7 text-[#1d2530]">
                  {selectedRow?.title}
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              <KeyValueRow
                label="カテゴリ"
                value={
                  selectedRow ? (
                    <TagChip label={selectedRow.categoryLabel} tone="violet" />
                  ) : (
                    <EmptyText label="未分類" />
                  )
                }
              />
              <KeyValueRow
                label="ページ数"
                value={
                  selectedRow ? (
                    formatPageCount(selectedRow.pageCount)
                  ) : (
                    <EmptyText label="—" />
                  )
                }
              />
              <KeyValueRow
                label="タグ"
                value={
                  selectedRow && selectedRow.tags.length > 0 ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {selectedRow.tags.map((tag, index) => (
                        <TagChip
                          key={`${selectedRow.id}:${tag}:${index}`}
                          label={tag}
                          tone={index % 2 === 0 ? "violet" : "green"}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyText label="タグなし" />
                  )
                }
              />
              <KeyValueRow
                label="閲覧位置"
                value={
                  selectedRow?.currentPage ? (
                    `P.${selectedRow.currentPage}`
                  ) : (
                    <EmptyText label="未記録" />
                  )
                }
              />
              <KeyValueRow
                label="最終閲覧"
                value={formatDateTime(selectedRow?.lastViewedAt ?? null)}
              />
              <KeyValueRow
                label="更新日"
                value={formatDateTime(selectedRow?.updatedAt ?? null)}
              />
              <KeyValueRow
                label="保存先"
                value={
                  <span className="break-words">
                    {selectedRow?.storagePathLabel ?? "ライブラリ / PDF"}
                  </span>
                }
              />
            </div>

            <button
              type="button"
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF] text-[15px] font-semibold text-[#111827] transition-colors hover:bg-[#f9fafb]"
              disabled={!selectedRow}
              onClick={() => {
                if (!selectedRow) {
                  return;
                }

                onOpenDocument(selectedRow.id);
              }}
            >
              PDFを開く
            </button>
          </section>

          <section className={cardClassName}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[13px] font-semibold text-[#30403d]">
                関連PDF
              </span>
              <span className="text-[12px] font-semibold text-[#6b7280]">
                すべて見る
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {relatedRows.length > 0 ? (
                relatedRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="flex w-full items-start gap-3 text-left"
                    onClick={() => setSelectedDocumentId(row.id)}
                  >
                    <IconBadge label="PDF" tone="violet" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold leading-5 text-[#29343b]">
                        {row.title}
                      </div>
                      <div className="mt-1 text-[12px] text-[#7d8784]">
                        {row.categoryLabel}
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-[13px] leading-5 text-[#94a09a]">
                  関連する PDF はまだありません。
                </div>
              )}
            </div>
          </section>

          <button
            type="button"
            className="inline-flex min-h-[56px] items-center justify-center rounded-[16px] border border-[#d1d5db] bg-[#FFFFFF] px-5 text-[15px] font-semibold text-[#111827] transition-colors hover:bg-[#f9fafb]"
            onClick={handleToolbarAddDocument}
          >
            PDFをインポート
          </button>
        </aside>
      </div>
    </div>
  );
};

export { PdfLibraryDashboard };
