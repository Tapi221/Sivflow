import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { glassMenuContentClass } from "@/components/ui/menu-styles";
import { ChevronRight, Folder, Pencil, Plus, Tag, Trash2 } from "@/ui/icons";
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

export const ContextMenu = ({
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
}: ContextMenuProps) => {
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
              >
                <DropdownMenuItemIcon>
                  <Folder className="h-4 w-4" />
                </DropdownMenuItemIcon>
                <DropdownMenuItemLabel>新規フォルダ</DropdownMenuItemLabel>
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
              >
                <DropdownMenuItemIcon>
                  <Plus className="h-4 w-4 text-blue-500" />
                </DropdownMenuItemIcon>
                <DropdownMenuItemLabel>新規カードセット</DropdownMenuItemLabel>
              </DropdownMenuItem>
            )}

            {(onCreateSubfolder || onCreateCardSet) && (
              <DropdownMenuSeparator />
            )}
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
          >
            <DropdownMenuItemIcon>
              <Pencil className="h-4 w-4" />
            </DropdownMenuItemIcon>
            <DropdownMenuItemLabel>名前を変更</DropdownMenuItemLabel>
          </DropdownMenuItem>
        )}

        {type === "card" && onMove && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onMove?.();
            }}
          >
            <DropdownMenuItemIcon>
              <ChevronRight className="h-4 w-4" />
            </DropdownMenuItemIcon>
            <DropdownMenuItemLabel>移動</DropdownMenuItemLabel>
          </DropdownMenuItem>
        )}

        {type === "folder" && onBulkTag && (
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onBulkTag?.();
            }}
          >
            <DropdownMenuItemIcon>
              <Tag className="h-4 w-4 text-violet-500" />
            </DropdownMenuItemIcon>
            <DropdownMenuItemLabel>タグを一括付与</DropdownMenuItemLabel>
          </DropdownMenuItem>
        )}

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:bg-red-50 focus:text-red-700"
            >
              <DropdownMenuItemIcon>
                <Trash2 className="h-4 w-4" />
              </DropdownMenuItemIcon>
              <DropdownMenuItemLabel>削除</DropdownMenuItemLabel>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};