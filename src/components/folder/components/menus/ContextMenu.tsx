import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  Folder,
  Pencil,
  Pin,
  Plus,
  Tag,
  Trash2,
} from "@/ui/icons";
import { useRef, type ReactNode } from "react";

interface ContextMenuProps {
  type: "folder" | "card";
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreateSubfolder?: () => void;
  onCreateCardSet?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onBulkTag?: () => void;
  isPinned?: boolean;
  onTogglePin?: () => void;
}

export function ContextMenu({
  type,
  children,
  open,
  onOpenChange,
  onCreateSubfolder,
  onCreateCardSet,
  onRename,
  onDelete,
  onMove,
  onBulkTag,
  isPinned,
  onTogglePin,
}: ContextMenuProps) {
  const suppressCloseAutoFocusRef = useRef(false);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        className="w-48"
        onCloseAutoFocus={(e) => {
          if (!suppressCloseAutoFocusRef.current) return;
          suppressCloseAutoFocusRef.current = false;
          e.preventDefault();
        }}
      >
        {type === "folder" && (
          <>
            {onCreateSubfolder && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  onOpenChange?.(false);
                  onCreateSubfolder?.();
                }}
                className="gap-2"
              >
                <Folder className="h-4 w-4" />
                新規フォルダ
              </DropdownMenuItem>
            )}

            {onCreateCardSet && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.stopPropagation();
                  onOpenChange?.(false);
                  onCreateCardSet?.();
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4 text-blue-500" />
                新規カードセット
              </DropdownMenuItem>
            )}

            {(onCreateSubfolder || onCreateCardSet) && <DropdownMenuSeparator />}
          </>
        )}

        {onTogglePin && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePin?.();
            }}
            className="gap-2"
          >
            <Pin className={`h-4 w-4 ${isPinned ? "text-amber-500" : ""}`} />
            {isPinned ? "ピン留め解除" : "ピン留め"}
          </DropdownMenuItem>
        )}

        {onRename && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              suppressCloseAutoFocusRef.current = true;
              onRename?.();
            }}
            className="gap-2"
          >
            <Pencil className="h-4 w-4" />
            名前を変更
          </DropdownMenuItem>
        )}

        {type === "card" && onMove && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMove?.();
            }}
            className="gap-2"
          >
            <ChevronRight className="h-4 w-4" />
            移動
          </DropdownMenuItem>
        )}

        {type === "folder" && onBulkTag && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBulkTag?.();
            }}
            className="gap-2"
          >
            <Tag className="h-4 w-4 text-violet-500" />
            タグを一括付与
          </DropdownMenuItem>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
              削除
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
