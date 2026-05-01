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

export const PdfLibraryTablePagination = ({
  table,
  totalRowCount,
}: PdfLibraryTablePaginationProps) => {
  const currentPage = table.getState().pagination.pageIndex;
  const totalPageCount = Math.max(table.getPageCount(), 1);
  const pageSize = table.getState().pagination.pageSize;
  const visibleStart = totalRowCount === 0 ? 0 : currentPage * pageSize + 1;
  const visibleEnd = Math.min(totalRowCount, (currentPage + 1) * pageSize);

  return (
    <div className="flex items-center justify-between border-t border-[#eef1f4] px-4 py-3">
      <Pagination className="mx-0 w-auto justify-start">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={!table.getCanPreviousPage()}
              onClick={() => {
                table.previousPage();
              }}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationButton
              isActive
              size="icon"
              type="button"
              onClick={() => {
                table.setPageIndex(currentPage);
              }}
            >
              {currentPage + 1}
            </PaginationButton>
          </PaginationItem>
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

      <div className="text-[14px] font-medium text-[#7b8794]">
        {visibleStart}-{visibleEnd} / {totalRowCount}件
      </div>
    </div>
  );
};
