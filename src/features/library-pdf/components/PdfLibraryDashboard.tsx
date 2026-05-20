import {
  type CSSProperties,
  type KeyboardEvent,
  useMemo,
  useState,
} from "react";

import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import { PdfLibraryContinueSection } from "@/features/library-pdf/components/sections/PdfLibraryContinueSection";
import { PdfLibraryTableSection } from "@/features/library-pdf/components/sections/PdfLibraryTableSection";
import { usePdfLibraryDashboardState } from "@/features/library-pdf/hooks/usePdfLibraryDashboardState";
import {
  buildPdfDashboardRows,
  type PdfDashboardRow,
} from "@/features/library-pdf/model/pdfLibraryRow";

import { useFolderDocumentUpload } from "@/components/folder/hooks/useFolderDocumentUpload";
import { TagChip } from "@/components/tag/TagChip";

import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import type { DocumentItem, Folder } from "@/types";

type PdfLibraryDashboardProps = {
  documents: DocumentItem[];
  folders: Folder[];
  onOpenDocument: (documentId: string) => void;
};

type ColumnId = "name" | "tags" | "lastViewed" | "updatedAt";

type DashboardColumn = {
  id: ColumnId;
  label: string;
  width: number;
  minWidth: number;
  maxWidth?: number;
  resizable: boolean;
  align?: "left" | "center" | "right";
};

const PAGE_SIZE = 10;
const COLUMN_STORAGE_KEY = "pdf-library-dashboard:column-widths:v1";
const COLUMN_GAP_PX = 16;

const DEFAULT_COLUMNS: DashboardColumn[] = [
  {
    id: "name",
    label: "名前",
    width: 420,
    minWidth: 96,
    resizable: true,
  },
  {
    id: "tags",
    label: "タグ",
    width: 240,
    minWidth: 56,
    resizable: true,
  },
  {
    id: "lastViewed",
    label: "最終閲覧",
    width: 168,
    minWidth: 72,
    maxWidth: 260,
    resizable: true,
  },
  {
    id: "updatedAt",
    label: "更新日時",
    width: 168,
    minWidth: 72,
    maxWidth: 260,
    resizable: true,
  },
];

const cardClassName =
  "box-border rounded-[10px] border border-[#D1D1D1] bg-[#FFFFFF] p-4 shadow-[0_6px_3px_0_rgba(0,0,0,0.06),0_10px_10px_0_rgba(0,0,0,0.05)]";

const selectedColumnBackground =
  "var(--ds-semantic-color-interactive-column-selected-subtle, rgba(106, 135, 110, 0.16))";

const selectedColumnAccent =
  "var(--ds-semantic-color-interactive-column-selected-accent, #4f6b54)";

const dateTimeTextStyle: CSSProperties = {
  fontFamily:
    "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Hiragino Sans\", \"Noto Sans JP\", system-ui, sans-serif",
  fontVariantNumeric: "tabular-nums",
  fontWeight: 400,
};

const isDateTimeColumn = (columnId: ColumnId): boolean => {
  return columnId === "lastViewed" || columnId === "updatedAt";
};

const buildGridTemplateColumns = (columns: DashboardColumn[]): string => {
  return columns.map((column) => `${column.width}px`).join(" ");
};

const buildGridMinWidth = (columns: DashboardColumn[]): number => {
  const widthTotal = columns.reduce((sum, column) => sum + column.width, 0);
  const gapTotal = Math.max(columns.length - 1, 0) * COLUMN_GAP_PX;

  return widthTotal + gapTotal;
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

const PdfOpenActionIcon = () => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15.9999 12.6671V16.667C15.9999 17.0206 15.8594 17.3598 15.6094 17.6098C15.3594 17.8599 15.0202 18.0003 14.6666 18.0003H7.33332C6.9797 18.0003 6.64057 17.8599 6.39052 17.6098C6.14047 17.3598 6 17.0206 6 16.667V9.33375C6 8.98013 6.14047 8.641 6.39052 8.39095C6.64057 8.1409 6.9797 8.00043 7.33332 8.00043H11.3333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 6H18V9.99997"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10.6667 13.3333L18 6"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

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
        className="inline-flex h-6 w-6 items-center justify-center"
        aria-label="PDF"
      >
        <svg
          width="15"
          height="15"
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

const PdfLibraryDashboard = ({
  documents,
  folders,
  onOpenDocument,
}: PdfLibraryDashboardProps) => {
  const { tagById, getTagColorKey } = useTags();
  const [, setExpandedFolders] = useState<Set<string>>(new Set());

  const rows = useMemo<PdfDashboardRow[]>(() => {
    return buildPdfDashboardRows({
      documents,
      folders,
      tagById,
    });
  }, [documents, folders, tagById]);

  const {
    columns,
    pageIndex,
    selectedColumnId,
    selectedColumnOverlay,
    selectedDocumentId,
    selectedRow,
    setPageIndex,
    setSelectedColumnId,
    setSelectedDocumentId,
    handleColumnResizeReset,
    handleColumnResizeStart,
  } = usePdfLibraryDashboardState({
    rows,
    defaultColumns: DEFAULT_COLUMNS,
    columnStorageKey: COLUMN_STORAGE_KEY,
    pageSize: PAGE_SIZE,
    columnGapPx: COLUMN_GAP_PX,
  });

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
    setExpandedFolders,
  });

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

  const paginatedRows = useMemo(() => {
    const start = pageIndex * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [pageIndex, rows]);
  const totalPageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  const visibleStart = rows.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const visibleEnd = Math.min(rows.length, (pageIndex + 1) * PAGE_SIZE);
  const gridTemplateColumns = useMemo(() => {
    return buildGridTemplateColumns(columns);
  }, [columns]);
  const gridMinWidth = useMemo(() => {
    return buildGridMinWidth(columns);
  }, [columns]);

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
        <PdfLibraryWorkspaceToolbar
          activeSection="pdf"
          onSelectSection={() => undefined}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept={currentFileAccept}
          multiple
          className="hidden"
          onChange={handleToolbarFileInputChange}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-2xl rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
            <div className="inline-flex rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
              PDF ライブラリ
            </div>
            <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
              PDF がまだありません
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
              PDF
              を取り込むと、この画面で概要カードと一覧テーブルをまとめて管理できます。
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
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
      <PdfLibraryWorkspaceToolbar
        activeSection="pdf"
        onSelectSection={() => undefined}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={currentFileAccept}
        multiple
        className="hidden"
        onChange={handleToolbarFileInputChange}
      />

      <div className="grid min-h-0 w-full grid-cols-1 gap-4 pt-4">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <PdfLibraryContinueSection
              cardClassName={cardClassName}
              continueRows={continueRows}
              formatDateTime={formatDateTime}
              onSelectDocument={setSelectedDocumentId}
              IconBadge={IconBadge}
            />
          </div>

          <PdfLibraryTableSection>
            <div className="overflow-x-auto overflow-y-hidden">
              <div
                className="min-w-max"
                style={{ minWidth: `${gridMinWidth}px` }}
              >
                <div className="relative">
                  {selectedColumnOverlay ? (
                    <>
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 z-0"
                        style={{
                          left: `${selectedColumnOverlay.left}px`,
                          width: `${selectedColumnOverlay.width}px`,
                          backgroundColor: selectedColumnBackground,
                        }}
                      />
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute top-0 z-0 h-[3px]"
                        style={{
                          left: `${selectedColumnOverlay.left}px`,
                          width: `${selectedColumnOverlay.width}px`,
                          backgroundColor: selectedColumnAccent,
                        }}
                      />
                    </>
                  ) : null}

                  <div className="relative z-[1]">
                    <div
                      className="grid h-8 items-center gap-4 border-b border-[#e5e7eb] text-[12px] font-medium leading-normal text-[#58635f]"
                      style={{ gridTemplateColumns }}
                    >
                      {columns.map((column) => {
                        const isSelectedColumn = column.id === selectedColumnId;

                        return (
                          <div key={column.id} className="relative min-w-0">
                            <button
                              type="button"
                              className="flex h-full w-full items-center pr-2 text-left"
                              style={{
                                color: isSelectedColumn
                                  ? selectedColumnAccent
                                  : undefined,
                              }}
                              onClick={() =>
                                setSelectedColumnId((currentValue) =>
                                  currentValue === column.id ? null : column.id,
                                )
                              }
                            >
                              <span
                                className="truncate"
                                style={
                                  isDateTimeColumn(column.id)
                                    ? dateTimeTextStyle
                                    : undefined
                                }
                              >
                                {column.label}
                              </span>
                            </button>

                            {column.resizable ? (
                              <div
                                role="separator"
                                aria-orientation="vertical"
                                aria-label={`${column.label} の列幅を調整`}
                                title="ドラッグで列幅調整、ダブルクリックで初期幅に戻す"
                                className="group/resize absolute inset-y-0 right-[-8px] z-10 flex w-4 items-center justify-center cursor-col-resize touch-none"
                                onDoubleClick={() =>
                                  handleColumnResizeReset(column.id)
                                }
                                onPointerDown={(event) =>
                                  handleColumnResizeStart(event, column.id)
                                }
                              >
                                <div className="h-[1em] w-[1px] bg-[#e5e7eb] transition-colors group-hover/resize:bg-[#9ca3af]" />
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="divide-y divide-[#eef0f3]">
                      {paginatedRows.map((row) => {
                        const isSelected = row.id === selectedRow?.id;

                        const handleRowKeyDown = (
                          event: KeyboardEvent<HTMLDivElement>,
                        ) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            onOpenDocument(row.id);
                            return;
                          }

                          if (event.key === " ") {
                            event.preventDefault();
                            setSelectedDocumentId(row.id);
                          }
                        };

                        return (
                          <div
                            key={row.id}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "grid h-8 w-full items-center gap-4 text-left text-[13px] font-[542] leading-[17px] transition-colors",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6A876E]/30",
                              isSelected && !selectedColumnId
                                ? "bg-[#f9fafb]"
                                : "hover:bg-[#fafafa]",
                            )}
                            style={{ gridTemplateColumns }}
                            onClick={() => setSelectedDocumentId(row.id)}
                            onDoubleClick={() => onOpenDocument(row.id)}
                            onKeyDown={handleRowKeyDown}
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-0">
                                <IconBadge label="PDF" tone="rose" />
                                <div className="flex min-w-0 flex-1 items-center gap-0">
                                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium leading-[17px] text-[#273038]">
                                    {row.title}
                                  </span>
                                  <button
                                    type="button"
                                    className="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] text-[#ababab] transition-colors hover:bg-[#f3f4f6] hover:text-[#808192]"
                                    aria-label={`${row.title}を開く`}
                                    title={`${row.title}を開く`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      onOpenDocument(row.id);
                                    }}
                                  >
                                    <PdfOpenActionIcon />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex min-w-0 items-center gap-2 overflow-hidden">
                              {row.tags.length > 0
                                ? row.tags
                                  .slice(0, 2)
                                  .map((tag) => (
                                    <TagChip
                                      key={`${row.id}:${tag}`}
                                      label={tag}
                                      colorKey={getTagColorKey(tag)}
                                    />
                                  ))
                                : null}
                            </div>

                            <div
                              className="truncate whitespace-nowrap text-[13px] font-normal leading-[17px] text-[#8f929c]"
                              style={dateTimeTextStyle}
                            >
                              {formatDateTime(row.lastViewedAt)}
                            </div>
                            <div
                              className="truncate whitespace-nowrap text-[13px] font-normal leading-[17px] text-[#8f929c]"
                              style={dateTimeTextStyle}
                            >
                              {formatDateTime(row.updatedAt)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
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

              <div className="text-[13px] leading-[17px] text-[#7d8784]">
                {visibleStart}–{visibleEnd} / {rows.length} 件
              </div>
            </div>
          </PdfLibraryTableSection>
        </div>
      </div>
    </div>
  );
};

export { PdfLibraryDashboard };
export default PdfLibraryDashboard;
