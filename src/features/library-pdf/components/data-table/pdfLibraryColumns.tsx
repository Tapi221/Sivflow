import type { ColumnDef } from "@tanstack/react-table";

import {
  formatDateTime,
  formatPageCount,
  type PdfLibraryRow,
} from "@/features/library-pdf/model/pdfLibraryRow";
import { cn } from "@/lib/utils";

import { PdfLibraryRowActionsMenu } from "./PdfLibraryRowActionsMenu";

type CreatePdfLibraryColumnsParams = {
  onOpenDocument: (documentId: string) => void;
};

const PdfFileBadge = () => {
  return (
    <span
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#fff1f2]"
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
};

const TagPill = ({ label }: { label: string }) => {
  return (
    <span className="inline-flex max-w-full items-center rounded-[999px] bg-[#f0ede7] px-3 py-1 text-[12px] font-medium text-[#6f6b63]">
      <span className="truncate">{label}</span>
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
          <div className="flex min-w-0 items-start gap-3">
            <PdfFileBadge />
            <div className="min-w-0">
              <button
                className="block max-w-full truncate text-left text-[16px] font-semibold text-[#20262a]"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDocument(item.id);
                }}
              >
                {item.fileName}
              </button>
              <p className="mt-1 truncate text-[12px] text-[#8b96a5]">
                {item.folderPathLabel}
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
          return <span className="text-[14px] text-[#9aa5b1]">未分類</span>;
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <TagPill key={tag} label={tag} />
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
          <span className="text-[14px] font-medium text-[#7b8794]">
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
              "text-[14px]",
              row.original.lastViewedAt ? "text-[#8b96a5]" : "text-[#9aa5b1]",
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
          <span className="text-[14px] text-[#64748b]">
            {formatDateTime(row.original.updatedAt)}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "…",
      size: 32,
      minSize: 32,
      maxSize: 32,
      enableResizing: false,
      cell: ({ row }) => {
        return (
          <div className="flex justify-end">
            <PdfLibraryRowActionsMenu row={row.original} onOpenDocument={onOpenDocument} />
          </div>
        );
      },
    },
  ];
};
