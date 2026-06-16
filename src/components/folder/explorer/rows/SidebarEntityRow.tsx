import React from "react";
import { cn } from "@web-renderer/lib/utils";
import type { ContextMenuVariant } from "@/components/folder/components/menus/ContextMenu";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import { EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS, EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS, EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS } from "./shared";
import { SidebarTreeRow } from "./SidebarTreeRow";



interface SidebarEntityRowProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children" | "title"
> {
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  menuActions?: MenuAction[];
  hasContextMenu?: boolean;
  contextMenuVariant?: ContextMenuVariant;
  isEditing?: boolean;
  isDimmed?: boolean;
  isDraggingOver?: boolean;
  containerStyle?: React.CSSProperties;
  containerClassName?: string;
  rowRef?: React.Ref<HTMLDivElement>;
  depth?: number;
  leading?: React.ReactNode;
  leadingClassName?: string;
  leadingStyle?: React.CSSProperties;
  icon?: React.ReactNode;
  iconClassName?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
  titleSlotClassName?: string;
  trailing?: React.ReactNode;
  input?: React.ReactNode;
  onContextMenuSelect?: () => void;
  children?: React.ReactNode;
  density?: "compact";
  selected?: boolean;
}



const SidebarEntityRowBase = ({
  menuOpen = false,
  onMenuOpenChange,
  menuActions,
  hasContextMenu = false,
  contextMenuVariant = "default",
  isEditing = false,
  isDimmed = false,
  isDraggingOver = false,
  containerStyle,
  containerClassName,
  rowRef,
  depth,
  leading,
  leadingClassName,
  leadingStyle,
  icon,
  iconClassName,
  title,
  subtitle,
  titleClassName,
  subtitleClassName,
  contentClassName,
  titleSlotClassName,
  trailing,
  input,
  onContextMenuSelect,
  children,
  className,
  selected,
  style,
  density = "compact",
  ...props
}: SidebarEntityRowProps) => {
  const handleMenuOpenChange = onMenuOpenChange ?? (() => {});
  const densityClassName = density === "compact" ? EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS : "";
  return (
    <SidebarTreeRow
      menuOpen={menuOpen}
      onMenuOpenChange={handleMenuOpenChange}
      menuActions={menuActions}
      hasContextMenu={hasContextMenu}
      contextMenuVariant={contextMenuVariant}
      isEditing={isEditing}
      isDimmed={isDimmed}
      isDraggingOver={isDraggingOver}
      style={containerStyle}
      className={containerClassName}
      onContextMenuSelect={onContextMenuSelect}
    >
      <ExplorerRow
        {...props}
        rowRef={rowRef}
        depth={depth}
        selected={selected}
        className={cn(
          EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS,
          EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS,
          densityClassName,
          selected && "ds-list-item--selected",
          className,
        )}
        style={style}
      >
        <ExplorerRowContent
          left={
            <>
              {leading !== undefined && (
                <div className={leadingClassName} style={leadingStyle}>
                  {leading}
                </div>
              )}
              {icon !== undefined && <span className={iconClassName}>{icon}</span>}
            </>
          }
          title={
            isEditing ? (
              input
            ) : (
              <div className={titleSlotClassName}>{title}</div>
            )
          }
          subtitle={isEditing ? null : subtitle}
          right={isEditing ? null : trailing}
          titleClassName={titleClassName}
          subtitleClassName={subtitleClassName}
          contentClassName={contentClassName}
        />
        {children}
      </ExplorerRow>
    </SidebarTreeRow>
  );
};



const SidebarEntityRow = React.memo(SidebarEntityRowBase);
SidebarEntityRow.displayName = "SidebarEntityRow";

export { SidebarEntityRow };
