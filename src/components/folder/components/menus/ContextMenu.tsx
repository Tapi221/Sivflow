import type { ComponentProps, ReactNode } from "react";
import { Fragment, useMemo, useRef } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { cn } from "@/lib/utils";

type ContextMenuVariant = "default" | "compact" | "create" | "toolbar";
type ContextMenuAnchorPoint = {
  x: number;
  y: number;
};
type DropdownMenuContentCloseAutoFocusEvent = Parameters<NonNullable<ComponentProps<typeof DropdownMenuContent>["onCloseAutoFocus"]>>[0];
interface ContextMenuProps {
  children?: ReactNode;
  anchorPoint?: ContextMenuAnchorPoint | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  actions: MenuAction[];
  className?: string;
  variant?: ContextMenuVariant;
}

const CONTEXT_MENU_COLLISION_PADDING_PX = 8;
const CONTEXT_MENU_VARIANT_CLASS_NAMES: Record<ContextMenuVariant, string> = {
  default: "min-w-[168px]",
  compact: "min-w-[144px]",
  create: "min-w-[190px]",
  toolbar: "min-w-[168px]",
};

const isVisibleMenuAction = (action: MenuAction) => action.hidden !== true;
const getContextMenuVariantClassName = (variant: ContextMenuVariant) => CONTEXT_MENU_VARIANT_CLASS_NAMES[variant];

const ContextMenu = ({ children, anchorPoint, open, onOpenChange, actions, className, variant = "default" }: ContextMenuProps) => {
  const suppressCloseAutoFocusRef = useRef(false);
  const visibleActions = actions.filter(isVisibleMenuAction);
  const anchoredStyle = useMemo(() => {
    if (anchorPoint === null || anchorPoint === undefined) return undefined;
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
  const handleCloseAutoFocus = (event: DropdownMenuContentCloseAutoFocusEvent) => {
    if (!suppressCloseAutoFocusRef.current) return;
    suppressCloseAutoFocusRef.current = false;
    event.preventDefault();
  };
  const handleActionSelect = (action: MenuAction) => {
    if (action.disabled === true) return;
    closeMenu();
    void action.onSelect?.();
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
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={0}
        collisionPadding={CONTEXT_MENU_COLLISION_PADDING_PX}
        className={cn(getContextMenuVariantClassName(variant), className)}
        onCloseAutoFocus={handleCloseAutoFocus}
      >
        {visibleActions.map((action) => (
          <Fragment key={action.id}>
            {action.separatorBefore === true ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              disabled={action.disabled}
              variant={action.danger === true ? "destructive" : "default"}
              onSelect={() => {
                handleActionSelect(action);
              }}
            >
              {action.icon}
              <span>{action.label}</span>
            </DropdownMenuItem>
          </Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ContextMenu };
export type { ContextMenuVariant };