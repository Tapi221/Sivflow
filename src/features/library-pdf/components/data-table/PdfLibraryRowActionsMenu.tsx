import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PdfLibraryRow } from "@/features/library-pdf/model/pdfLibraryRow";
import { Copy, ExternalLink, MoreVertical } from "@/ui/icons";

type PdfLibraryRowActionsMenuProps = {
  row: PdfLibraryRow;
  onOpenDocument: (documentId: string) => void;
};

const writeClipboard = async (value: string) => {
  if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // no-op
  }
};

export const PdfLibraryRowActionsMenu = ({
  row,
  onOpenDocument,
}: PdfLibraryRowActionsMenuProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${row.fileName} の操作`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-[#7b8794] transition-colors hover:bg-[rgba(0,0,0,0.04)]"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <MoreVertical size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(event) => event.stopPropagation()}>
        <DropdownMenuItem
          onClick={() => {
            onOpenDocument(row.id);
          }}
        >
          <DropdownMenuItemIcon>
            <ExternalLink size={16} />
          </DropdownMenuItemIcon>
          <DropdownMenuItemLabel>開く</DropdownMenuItemLabel>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void writeClipboard(row.fileName);
          }}
        >
          <DropdownMenuItemIcon>
            <Copy size={16} />
          </DropdownMenuItemIcon>
          <DropdownMenuItemLabel>ファイル名をコピー</DropdownMenuItemLabel>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            void writeClipboard(row.folderPathLabel);
          }}
        >
          <DropdownMenuItemIcon>
            <Copy size={16} />
          </DropdownMenuItemIcon>
          <DropdownMenuItemLabel>保存先フォルダをコピー</DropdownMenuItemLabel>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
