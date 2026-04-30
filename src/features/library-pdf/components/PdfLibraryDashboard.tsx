import { useEffect, useMemo, useState } from "react";

import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { useSetBreadcrumbAction } from "@/contexts/BreadcrumbContext";
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

const PAGE_SIZE = 10;

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

const cardClassName = "rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-4";

const IconBadge = ({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "green" | "violet" | "blue" | "rose";
}) => {
  if (label === "PDF") {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-[999px] bg-[#fff1f2]"
        aria-label="PDF"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M7 3.5C6.60218 3.5 6.22064 3.65804 5.93934 3.93934C5.65804 4.22064 5.5 4.60218 5.5 5V19C5.5 19.3978 5.65804 19.7794 5.93934 20.0607C6.22064 20.342 6.60218 20.5 7 20.5H17C17.3978 20.5 17.7794 20.342 18.0607 20.0607C18.342 19.7794 18.5 19.3978 18.5 19V9.41411C18.4999 9.28155 18.4473 9.15433 18.3535 9.06061L12.9394 3.64655C12.8457 3.5528 12.7186 3.50006 12.586 3.5H7ZM5.23223 3.23223C5.70107 2.76339 6.33696 2.5 7 2.5H12.586C12.9838 2.50008 13.3653 2.65816 13.6466 2.93945L19.0605 8.35339C19.3418 8.63463 19.4999 9.01613 19.5 9.41389V19C19.5 19.663 19.2366 20.2989 18.7678 20.7678C18.2989 21.2366 17.663 21.5 17 21.5H7C6.33696 21.5 5.70107 21.2366 5.23223 20.7678C4.76339 20.2989 4.5 19.663 4.5 19V5C4.5 4.33696 4.76339 3.70107 5.23223 3.23223Z"
            fill="#E72A2A"
          />
          <path
            d="M7.2328 14.8V11.0182H8.72484C9.01168 11.0182 9.25604 11.073 9.45794 11.1826C9.65983 11.2909 9.81371 11.4417 9.91958 11.635C10.0267 11.827 10.0802 12.0486 10.0802 12.2998C10.0802 12.5509 10.0261 12.7725 9.91774 12.9645C9.8094 13.1566 9.65244 13.3062 9.44686 13.4133C9.2425 13.5204 8.99506 13.5739 8.70453 13.5739H7.75353V12.9331H8.57527C8.72915 12.9331 8.85595 12.9067 8.95566 12.8537C9.05661 12.7996 9.13171 12.7251 9.18095 12.6303C9.23142 12.5343 9.25666 12.4241 9.25666 12.2998C9.25666 12.1742 9.23142 12.0646 9.18095 11.9711C9.13171 11.8763 9.05661 11.803 8.95566 11.7513C8.85472 11.6984 8.72669 11.6719 8.57157 11.6719H8.03237V14.8H7.2328ZM11.9402 14.8H10.5996V11.0182H11.9513C12.3317 11.0182 12.6592 11.0939 12.9337 11.2454C13.2082 11.3956 13.4193 11.6116 13.5671 11.8935C13.716 12.1754 13.7905 12.5127 13.7905 12.9054C13.7905 13.2994 13.716 13.6379 13.5671 13.9211C13.4193 14.2042 13.207 14.4215 12.93 14.5729C12.6542 14.7243 12.3243 14.8 11.9402 14.8ZM11.3992 14.115H11.907C12.1433 14.115 12.3422 14.0731 12.5034 13.9894C12.6659 13.9045 12.7878 13.7733 12.8691 13.5961C12.9515 13.4176 12.9928 13.1874 12.9928 12.9054C12.9928 12.626 12.9515 12.3976 12.8691 12.2204C12.7878 12.0431 12.6665 11.9126 12.5053 11.8289C12.344 11.7452 12.1452 11.7033 11.9088 11.7033H11.3992V14.115ZM14.3828 14.8V11.0182H16.8868V11.6775H15.1824V12.5786H16.7206V13.2378H15.1824V14.8H14.3828Z"
            fill="#E72A2A"
          />
        </svg>
      </span>
    );
  }

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
  const setBreadcrumbAction = useSetBreadcrumbAction();
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

  const breadcrumbAction = useMemo(
    () => (
      <button
        type="button"
        className="inline-flex h-8 w-fit items-center justify-center rounded-[8px] border-0 bg-[#6A876E] px-5 text-[12px] font-medium leading-normal text-white transition-colors hover:bg-[#5f7963]"
        onClick={handleToolbarAddDocument}
      >
        PDFをインポート
      </button>
    ),
    [handleToolbarAddDocument],
  );

  useEffect(() => {
    setBreadcrumbAction(breadcrumbAction);

    return () => setBreadcrumbAction(null);
  }, [breadcrumbAction, setBreadcrumbAction]);

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
        <div className="w-full max-w-2xl rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
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

      <div className="grid min-h-0 w-full grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_296px]">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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

          <section className="min-h-0 flex-1 rounded-[10px] bg-[#FFFFFF]">
            <div className="overflow-hidden">
              <div className="grid h-8 grid-cols-[minmax(240px,1.9fr)_minmax(160px,1fr)_80px_120px_120px_32px] items-center gap-4 border-b border-[#e5e7eb] text-[12px] font-medium leading-normal text-[#58635f]">
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
                        "grid h-8 w-full grid-cols-[minmax(240px,1.9fr)_minmax(160px,1fr)_80px_120px_120px_32px] items-center gap-4 text-left text-[13px] font-[542] leading-[17px] transition-colors",
                        isSelected ? "bg-[#f9fafb]" : "hover:bg-[#fafafa]",
                      )}
                      onClick={() => setSelectedDocumentId(row.id)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <IconBadge label="PDF" tone="rose" />
                          <span className="truncate text-[13px] font-medium leading-[17px] text-[#273038]">
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
                          <span className="text-[13px] leading-[17px] text-[#93a09a]">
                            タグなし
                          </span>
                        )}
                      </div>

                      <div className="text-[13px] font-[542] leading-[17px] text-[#46514f]">
                        {formatPageCount(row.pageCount)}
                      </div>
                      <div className="text-[13px] leading-[17px] text-[#75817c]">
                        {formatDateTime(row.lastViewedAt)}
                      </div>
                      <div className="text-[13px] leading-[17px] text-[#75817c]">
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

            <div className="flex items-center justify-between border-t border-[#e5e7eb] pt-4">
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

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                className="inline-flex h-8 w-fit items-center justify-center rounded-[8px] border-0 bg-[#6A876E] px-5 text-[14px] font-[542] leading-[17px] text-white transition-colors hover:bg-[#5f7963]"
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
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export { PdfLibraryDashboard };
