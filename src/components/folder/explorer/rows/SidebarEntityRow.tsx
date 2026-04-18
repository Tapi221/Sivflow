import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import { cn } from "@/lib/utils";
import React from "react";
import { ExplorerRow } from "./ExplorerRow";
import { ExplorerRowContent } from "./ExplorerRowContent";
import { SidebarTreeRow } from "./SidebarTreeRow";
import {
  EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS,
  EXPLORER_ENTITY_ROW_INTERACTIVE_CLASS,
  EXPLORER_ENTITY_ROW_SHELL_BASE_CLASS,
} from "./shared";

interface SidebarEntityRowProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "title"> {
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  menuActions?: MenuAction[];
  hasContextMenu?: boolean;
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

  const densityClassName =
    density === "compact" ? EXPLORER_ENTITY_ROW_DENSITY_COMPACT_CLASS : "";

  return (
    <SidebarTreeRow
      menuOpen={menuOpen}
      onMenuOpenChange={handleMenuOpenChange}
      menuActions={menuActions}
      hasContextMenu={hasContextMenu}
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
              {leading !== undefined ? (
                <div className={leadingClassName} style={leadingStyle}>
                  {leading}
                </div>
              ) : null}
              {icon !== undefined ? (
                <span className={iconClassName}>{icon}</span>
              ) : null}
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

export const SidebarEntityRow = React.memo(SidebarEntityRowBase);
