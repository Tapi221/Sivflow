import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { glassMenuContentClass } from "@/components/ui/menu-styles";
import {
  ChevronRight,
  Folder,
  Pencil,
  Plus,
  Tag,
  Trash2,
} from "@/ui/icons";
import { useMemo, useRef, type ReactNode } from "react";

interface ContextMenuProps {
  type: "folder" | "card";
  children?: ReactNode;
  anchorPoint?: { x: number; y: number } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreateSubfolder?: () => void;
  onCreateCardSet?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onMove?: () => void;
  onBulkTag?: () => void;
}

const CONTEXT_MENU_CURSOR_OFFSET_PX = 6;
const CONTEXT_MENU_COLLISION_PADDING_PX = 8;

export function ContextMenu({
  type,
  children,
  anchorPoint,
  open,
  onOpenChange,
  onCreateSubfolder,
  onCreateCardSet,
  onRename,
  onDelete,
  onMove,
  onBulkTag,
}: ContextMenuProps) {
  const suppressCloseAutoFocusRef = useRef(false);

  const anchoredStyle = useMemo(() => {
    if (!anchorPoint) return undefined;

    return {
      position: "fixed" as const,
      left: anchorPoint.x + CONTEXT_MENU_CURSOR_OFFSET_PX,
      top: anchorPoint.y + CONTEXT_MENU_CURSOR_OFFSET_PX,
      width: 1,
      height: 1,
    };
  }, [anchorPoint]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={false}>
      <DropdownMenuTrigger asChild>
        {children ?? (
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            className="pointer-events-none absolute overflow-hidden opacity-0"
            style={anchoredStyle}
          />
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={CONTEXT_MENU_CURSOR_OFFSET_PX}
        collisionPadding={CONTEXT_MENU_COLLISION_PADDING_PX}
        className={`w-48 ${glassMenuContentClass}`}
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
                  e.preventDefault();
                  e.stopPropagation();
                  suppressCloseAutoFocusRef.current = true;
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
                  e.preventDefault();
                  e.stopPropagation();
                  suppressCloseAutoFocusRef.current = true;
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