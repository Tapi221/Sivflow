import React from "react";
import { cn } from "@web-renderer/lib/utils";
import type { ContextMenuVariant } from "@/components/folder/components/menus/ContextMenu";
import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { useContextMenuAnchor } from "@/components/folder/components/menus/useContextMenuAnchor";



interface SidebarTreeRowProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  menuActions?: MenuAction[];
  hasContextMenu?: boolean;
  contextMenuVariant?: ContextMenuVariant;
  isEditing?: boolean;
  isDimmed?: boolean;
  isDraggingOver?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onContextMenuSelect?: () => void;
  children: React.ReactNode;
}



const SidebarTreeRow = ({ menuOpen, onMenuOpenChange, menuActions = [], hasContextMenu = false, contextMenuVariant = "default", isEditing = false, isDimmed = false, isDraggingOver = false, style, className, onContextMenuSelect, children }: SidebarTreeRowProps) => {
  const { anchorPoint, handleContextMenu, resetAnchor } = useContextMenuAnchor();
  const suppressNextClickRef = React.useRef(false);
  const suppressNextClickTimeoutRef = React.useRef<number | null>(null);
  const clearSuppressedClick = React.useCallback(() => {
    suppressNextClickRef.current = false;
    if (
      typeof window !== "undefined" &&
      suppressNextClickTimeoutRef.current !== null
    ) {
      window.clearTimeout(suppressNextClickTimeoutRef.current);
      suppressNextClickTimeoutRef.current = null;
    }
  }, []);
  const scheduleSuppressedClickClear = React.useCallback(() => {
    if (typeof window === "undefined") return;
    if (suppressNextClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressNextClickTimeoutRef.current);
    }
    suppressNextClickTimeoutRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = false;
      suppressNextClickTimeoutRef.current = null;
    }, 0);
  }, []);
  React.useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        suppressNextClickTimeoutRef.current !== null
      ) {
        window.clearTimeout(suppressNextClickTimeoutRef.current);
      }
    };
  }, []);
  const canOpenContextMenu = hasContextMenu && !isEditing && menuActions.length > 0;
  return (
    <div
      style={style}
      className={cn(
        "relative",
        isDimmed && "ds-list-item__dimmed",
        isDraggingOver && "ds-list-item__drag-over rounded-sm",
        className,
      )}
      onMouseDownCapture={
        canOpenContextMenu
          ? (event) => {
            if (event.button !== 2) return;
            suppressNextClickRef.current = true;
          }
          : undefined
      }
      onClickCapture={
        canOpenContextMenu
          ? (event) => {
            if (!suppressNextClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            clearSuppressedClick();
          }
          : undefined
      }
      onAuxClickCapture={
        canOpenContextMenu
          ? (event) => {
            if (!suppressNextClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            clearSuppressedClick();
          }
          : undefined
      }
      onContextMenu={
        canOpenContextMenu
          ? (event) => {
            suppressNextClickRef.current = true;
            handleContextMenu(event);
            onContextMenuSelect?.();
            onMenuOpenChange(true);
            scheduleSuppressedClickClear();
          }
          : undefined
      }
    >
      {children}
      {canOpenContextMenu && (
        <ContextMenu
          open={menuOpen}
          anchorPoint={menuOpen ? anchorPoint : null}
          onOpenChange={(open) => {
            if (!open) {
              clearSuppressedClick();
              resetAnchor();
            }
            onMenuOpenChange(open);
          }}
          actions={menuActions}
          variant={contextMenuVariant}
        />
      )}
    </div>
  );
};



export { SidebarTreeRow };
