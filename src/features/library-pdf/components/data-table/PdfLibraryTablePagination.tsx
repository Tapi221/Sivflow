import type { Table } from "@tanstack/react-table";

import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { PdfLibraryRow } from "@/features/library-pdf/model/pdfLibraryRow";

type PdfLibraryTablePaginationProps = {
  table: Table<PdfLibraryRow>;
  totalRowCount: number;
};

const buildVisiblePageNumbers = (
  currentPage: number,
  totalPageCount: number,
): number[] => {
  if (totalPageCount <= 1) {
    return [0];
  }

  const pages = new Set<number>([0, totalPageCount - 1]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;

    if (page >= 0 && page < totalPageCount) {
      pages.add(page);
    }
  }

  return Array.from(pages).sort((left, right) => left - right);
};

export const PdfLibraryTablePagination = ({
  table,
  totalRowCount,
}: PdfLibraryTablePaginationProps) => {
  const currentPage = table.getState().pagination.pageIndex;
  const totalPageCount = Math.max(table.getPageCount(), 1);
  const pageSize = table.getState().pagination.pageSize;
  const visibleStart = totalRowCount === 0 ? 0 : currentPage * pageSize + 1;
  const visibleEnd = Math.min(totalRowCount, (currentPage + 1) * pageSize);
  const pageNumbers = buildVisiblePageNumbers(currentPage, totalPageCount);

  return (
    <div className="flex flex-col gap-3 border-t border-[#eef2f7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-[#6b7280]">
        {visibleStart}-{visibleEnd} / {totalRowCount} 件
      </div>

      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.previousPage();
              }}
            />
          </PaginationItem>

          {pageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationButton
                isActive={pageNumber === currentPage}
                size="icon"
                type="button"
                onClick={() => {
                  table.setPageIndex(pageNumber);
                }}
              >
                {pageNumber + 1}
              </PaginationButton>
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              disabled={!table.getCanNextPage()}
              onClick={() => {
                table.nextPage();
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};
