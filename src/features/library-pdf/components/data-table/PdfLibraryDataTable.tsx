import { useEffect, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { PAGE_SIZE, type PdfLibraryRow } from "@/features/library-pdf/model/pdfLibraryRow";
import { usePdfLibraryColumnSizing } from "@/features/library-pdf/hooks/usePdfLibraryColumnSizing";

import { createPdfLibraryColumns } from "./pdfLibraryColumns";
import { PdfLibraryTablePagination } from "./PdfLibraryTablePagination";

type PdfLibraryDataTableProps = {
  rows: PdfLibraryRow[];
  selectedDocumentId: string | null;
  onSelectDocument: (documentId: string) => void;
  onOpenDocument: (documentId: string) => void;
};

export const PdfLibraryDataTable = ({
  rows,
  selectedDocumentId,
  onSelectDocument,
  onOpenDocument,
}: PdfLibraryDataTableProps) => {
  const { columnSizing, setColumnSizing } = usePdfLibraryColumnSizing();

  const columns = useMemo(
    () =>
      createPdfLibraryColumns({
        onOpenDocument,
      }),
    [onOpenDocument],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: {
      columnSizing,
    },
    columnResizeMode: "onChange",
    defaultColumn: {
      minSize: 72,
      size: 160,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: PAGE_SIZE,
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnSizingChange: setColumnSizing,
  });

  useEffect(() => {
    if (!selectedDocumentId) {
      return;
    }

    const rowIndex = rows.findIndex((row) => row.id === selectedDocumentId);

    if (rowIndex === -1) {
      return;
    }

    const nextPageIndex = Math.floor(rowIndex / PAGE_SIZE);

    if (table.getState().pagination.pageIndex !== nextPageIndex) {
      table.setPageIndex(nextPageIndex);
    }
  }, [rows, selectedDocumentId, table]);

  return (
    <section className="overflow-hidden rounded-[18px] border border-[#e5e7eb] bg-[#FFFFFF] shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <div className="border-b border-[#eef2f7] px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[#20262a]">PDF 一覧</h2>
            <p className="mt-1 text-sm text-[#6f7b78]">
              ライブラリ内の PDF を表形式で管理できます。
            </p>
          </div>
          <div className="rounded-full bg-[#f8fafc] px-3 py-1 text-xs font-semibold text-[#52606d]">
            {rows.length} 件
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-[1120px] table-fixed">
          <TableHeader className="bg-[#fafbfc]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#eef2f7] hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canResize = header.column.getCanResize();

                  return (
                    <TableHead
                      key={header.id}
                      className="relative h-12 border-b border-[#eef2f7] px-4 text-xs font-semibold tracking-[0.01em] text-[#667085]"
                      style={{ width: header.getSize() }}
                    >
                      <div className="truncate pr-3">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </div>

                      {canResize ? (
                        <div
                          aria-hidden="true"
                          className={cn(
                            "absolute inset-y-0 right-0 w-3 cursor-col-resize touch-none select-none",
                            header.column.getIsResizing() && "bg-[#dfe7df]",
                          )}
                          onDoubleClick={() => {
                            header.column.resetSize();
                          }}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                        >
                          <div className="absolute bottom-2 right-1 top-2 w-px bg-[#e5e7eb]" />
                        </div>
                      ) : null}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  className="h-24 text-center text-sm text-[#7b8794]"
                  colSpan={columns.length}
                >
                  表示できる PDF がありません。
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => {
                const isSelected = row.original.id === selectedDocumentId;

                return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      "cursor-pointer border-[#eef2f7] transition-colors",
                      isSelected
                        ? "bg-[rgba(106,135,110,0.12)] hover:bg-[rgba(106,135,110,0.16)]"
                        : "hover:bg-[#f8fafc]",
                    )}
                    tabIndex={0}
                    onClick={() => {
                      onSelectDocument(row.original.id);
                      onOpenDocument(row.original.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") {
                        return;
                      }

                      event.preventDefault();
                      onSelectDocument(row.original.id);
                      onOpenDocument(row.original.id);
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className="h-[72px] px-4 align-middle"
                        style={{ width: cell.column.getSize() }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <PdfLibraryTablePagination table={table} totalRowCount={rows.length} />
    </section>
  );
};
