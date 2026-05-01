import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
        <Button
          aria-label={`${row.fileName} の操作`}
          className="h-8 w-8 rounded-full p-0"
          size="icon"
          type="button"
          variant="ghost"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <MoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
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
            void writeClipboard(row.storagePathLabel);
          }}
        >
          <DropdownMenuItemIcon>
            <Copy size={16} />
          </DropdownMenuItemIcon>
          <DropdownMenuItemLabel>保存先パスをコピー</DropdownMenuItemLabel>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
