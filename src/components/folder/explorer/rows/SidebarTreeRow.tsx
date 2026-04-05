import { ContextMenu } from "@/components/folder/components/menus/ContextMenu";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { useContextMenuAnchor } from "@/components/folder/components/menus/useContextMenuAnchor";
import { cn } from "@/lib/utils";
import React from "react";

interface SidebarTreeRowProps {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  menuActions?: MenuAction[];
  hasContextMenu?: boolean;
  isEditing?: boolean;
  isDimmed?: boolean;
  isDraggingOver?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onContextMenuSelect?: () => void;
  children: React.ReactNode;
}

export const SidebarTreeRow = ({
  menuOpen,
  onMenuOpenChange,
  menuActions = [],
  hasContextMenu = false,
  isEditing = false,
  isDimmed = false,
  isDraggingOver = false,
  style,
  className,
  onContextMenuSelect,
  children,
}: SidebarTreeRowProps) => {
  const { anchorPoint, handleContextMenu, resetAnchor } =
    useContextMenuAnchor();

  const canOpenContextMenu =
    hasContextMenu && !isEditing && menuActions.length > 0;

  return (
    <div
      style={style}
      className={cn(
        "relative",
        isDimmed && "opacity-50",
        isDraggingOver && "rounded-sm bg-blue-50/50 ring-1 ring-blue-200/50",
        className,
      )}
      onContextMenu={
        canOpenContextMenu
          ? (event) => {
              handleContextMenu(event);
              onContextMenuSelect?.();
              onMenuOpenChange(true);
            }
          : undefined
      }
    >
      {children}

      {canOpenContextMenu ? (
        <ContextMenu
          open={menuOpen}
          anchorPoint={menuOpen ? anchorPoint : null}
          onOpenChange={(open) => {
            if (!open) resetAnchor();
            onMenuOpenChange(open);
          }}
          actions={menuActions}
        />
      ) : null}
    </div>
  );
};
