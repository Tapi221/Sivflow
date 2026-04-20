import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMemo, useRef, type ReactNode } from "react";
import { ExplorerMenuPanel } from "./ExplorerMenuPanel";
import type { MenuAction } from "./menuActions";

interface ContextMenuProps {
  children?: ReactNode;
  anchorPoint?: { x: number; y: number } | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions: MenuAction[];
  className?: string;
}

const CONTEXT_MENU_COLLISION_PADDING_PX = 8;

/**
 * 右クリックなどで表示される汎用的なコンテキストメニューのコンテナ
 */
export const ContextMenu = ({
  children,
  anchorPoint,
  open,
  onOpenChange,
  actions,
  className,
}: ContextMenuProps) => {
  const suppressCloseAutoFocusRef = useRef(false);

  const anchoredStyle = useMemo(() => {
    if (!anchorPoint) return undefined;

    return {
      position: "fixed" as const,
      left: anchorPoint.x,
      top: anchorPoint.y,
      width: 0,
      height: 0,
    };
  }, [anchorPoint]);

  const closeMenu = () => {
    suppressCloseAutoFocusRef.current = true;
    onOpenChange?.(false);
  };

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

      <ExplorerMenuPanel
        actions={actions}
        closeMenu={closeMenu}
        side="right"
        align="start"
        sideOffset={0}
        collisionPadding={CONTEXT_MENU_COLLISION_PADDING_PX}
        className={className}
        onCloseAutoFocus={(e) => {
          if (!suppressCloseAutoFocusRef.current) return;
          suppressCloseAutoFocusRef.current = false;
          e.preventDefault();
        }}
      />
    </DropdownMenu>
  );
};