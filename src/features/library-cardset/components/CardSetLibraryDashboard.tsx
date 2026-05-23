import { type CSSProperties, type KeyboardEvent, useMemo, useState } from "react";

import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import { PdfLibraryTableSection } from "@/features/library-pdf/components/sections/PdfLibraryTableSection";
import { usePdfLibraryDashboardState } from "@/features/library-pdf/hooks/usePdfLibraryDashboardState";
import {
  buildCardSetDashboardRows,
  type CardSetDashboardRow,
} from "@/features/library-cardset/model/cardSetLibraryRow";

import { TagChip } from "@/components/tag/TagChip";

import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import type { Card, CardSet, Folder } from "@/types";

type CardSetLibraryDashboardProps = {
  cards: Card[];
  cardSets: CardSet[];
  folders: Folder[];
  onOpenCardSet: (cardSetId: string) => void;
};

type ColumnId = "name" | "cards" | "tags" | "updatedAt";

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
const COLUMN_STORAGE_KEY = "cardset-library-dashboard:column-widths:v1";
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
    id: "cards",
    label: "カード数",
    width: 120,
    minWidth: 72,
    maxWidth: 180,
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
    id: "updatedAt",
    label: "更新日時",
    width: 168,
    minWidth: 72,
    maxWidth: 260,
    resizable: true,
  },
];

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
  return columnId === "updatedAt";
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

const CardSetOpenActionIcon = () => {
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

const IconBadge = () => {
  return (
    <span
      className="inline-flex h-8 w-8 items-center justify-center rounded-[999px] bg-[#f3f4f6] text-[#4b5563]"
      aria-label="CardSet"
    >
      <svg
        width="17"
        height="17"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          x="3.2"
          y="4.3"
          width="9.25"
          height="6.55"
          rx="1.65"
          stroke="currentColor"
          strokeWidth="1.45"
        />
        <path
          d="M5.55 12.2C5.81676 13.0751 6.6302 13.7125 7.5924 13.7125H11.8924C13.095 13.7125 14.07 12.7375 14.07 11.535V8.435C14.07 7.48669 13.4639 6.68008 12.6178 6.38164"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
        />
        <path
          d="M5.8 7.6H9.8"
          stroke="currentColor"
          strokeWidth="1.45"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

const CardSetLibraryDashboard = ({
  cards,
  cardSets,
  folders,
  onOpenCardSet,
}: CardSetLibraryDashboardProps) => {
  const { tagById, getTagColorKey } = useTags();

  const rows = useMemo<CardSetDashboardRow[]>(() => {
    return buildCardSetDashboardRows({
      cardSets,
      cards,
      folders,
      tagById,
    });
  }, [cardSets, cards, folders, tagById]);

  const {
    columns,
    pageIndex,
    selectedColumnId,
    selectedColumnOverlay,
    selectedDocumentId: selectedCardSetId,
    selectedRow,
    setPageIndex,
    setSelectedColumnId,
    setSelectedDocumentId: setSelectedCardSetId,
    handleColumnResizeReset,
    handleColumnResizeStart,
  } = usePdfLibraryDashboardState({
    rows,
    defaultColumns: DEFAULT_COLUMNS,
    columnStorageKey: COLUMN_STORAGE_KEY,
    pageSize: PAGE_SIZE,
    columnGapPx: COLUMN_GAP_PX,
  });

  void selectedCardSetId;

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
          activeSection="flashcard"
          onSelectSection={() => undefined}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-2xl rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
            <div className="inline-flex rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
              Flashcard ライブラリ
            </div>
            <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
              カードセットがまだありません
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
              カードセットを作成すると、この画面で一覧テーブルとして管理できます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
      <PdfLibraryWorkspaceToolbar
        activeSection="flashcard"
        onSelectSection={() => undefined}
      />

      <div className="grid min-h-0 w-full grid-cols-1 gap-4 pt-4">
        <div className="flex min-h-0 min-w-0 flex-col gap-4">
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
                            onOpenCardSet(row.id);
                            return;
                          }

                          if (event.key === " ") {
                            event.preventDefault();
                            setSelectedCardSetId(row.id);
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
                            onClick={() => setSelectedCardSetId(row.id)}
                            onDoubleClick={() => onOpenCardSet(row.id)}
                            onKeyDown={handleRowKeyDown}
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-0">
                                <IconBadge />
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
                                      onOpenCardSet(row.id);
                                    }}
                                  >
                                    <CardSetOpenActionIcon />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="truncate whitespace-nowrap text-[13px] font-normal leading-[17px] text-[#8f929c]">
                              {row.cardCount} 件
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

export { CardSetLibraryDashboard };
export default CardSetLibraryDashboard;
