import type { ColumnDef } from "@tanstack/react-table";

import { TagChip } from "@/components/tag/TagChip";
import { cn } from "@/lib/utils";
import {
  formatDateTime,
  formatPageCount,
  type PdfLibraryRow,
} from "@/features/library-pdf/model/pdfLibraryRow";
import { FileText } from "@/ui/icons";

import { PdfLibraryRowActionsMenu } from "./PdfLibraryRowActionsMenu";

type CreatePdfLibraryColumnsParams = {
  onOpenDocument: (documentId: string) => void;
};

const PdfFileBadge = () => {
  return (
    <span
      aria-label="PDF"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff1f2] text-[#dc2626]"
    >
      <FileText size={18} />
    </span>
  );
};

export const createPdfLibraryColumns = ({
  onOpenDocument,
}: CreatePdfLibraryColumnsParams): ColumnDef<PdfLibraryRow>[] => {
  return [
    {
      id: "name",
      accessorKey: "fileName",
      header: "名前",
      size: 420,
      minSize: 260,
      cell: ({ row }) => {
        const item = row.original;

        return (
          <div className="flex min-w-0 items-center gap-3">
            <PdfFileBadge />
            <div className="min-w-0">
              <button
                className="block max-w-full truncate text-left text-sm font-semibold text-[#1f2937] hover:text-[#4f6b54]"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDocument(item.id);
                }}
              >
                {item.fileName}
              </button>
              <p className="mt-1 truncate text-xs text-[#7b8794]">
                {item.storagePathLabel}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      id: "tags",
      accessorKey: "tags",
      header: "タグ",
      size: 240,
      minSize: 160,
      cell: ({ row }) => {
        const tags = row.original.tags;

        if (tags.length === 0) {
          return <span className="text-sm text-[#9aa5b1]">未分類</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <TagChip
                key={tag}
                className="max-w-full"
                label={tag}
              />
            ))}
          </div>
        );
      },
    },
    {
      id: "page",
      accessorKey: "pageCount",
      header: "ページ",
      size: 88,
      minSize: 72,
      maxSize: 140,
      cell: ({ row }) => {
        return (
          <span className="text-sm font-medium text-[#52606d]">
            {formatPageCount(row.original.pageCount)}
          </span>
        );
      },
    },
    {
      id: "lastViewed",
      accessorKey: "lastViewedAt",
      header: "最終閲覧",
      size: 168,
      minSize: 140,
      maxSize: 260,
      cell: ({ row }) => {
        return (
          <span
            className={cn(
              "text-sm",
              row.original.lastViewedAt ? "text-[#52606d]" : "text-[#9aa5b1]",
            )}
          >
            {formatDateTime(row.original.lastViewedAt)}
          </span>
        );
      },
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      header: "更新日時",
      size: 168,
      minSize: 140,
      maxSize: 260,
      cell: ({ row }) => {
        return (
          <span className="text-sm text-[#374151]">
            {formatDateTime(row.original.updatedAt)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "…",
      size: 48,
      minSize: 48,
      maxSize: 48,
      enableResizing: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <PdfLibraryRowActionsMenu
              row={row.original}
              onOpenDocument={onOpenDocument}
            />
          </div>
        );
      },
    },
  ];
};
