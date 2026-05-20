import React from "react";

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { floatingPanelPresets } from "@/components/ui/menu-styles";

import type { MenuAction } from "./menuActions";

import { cn } from "@/lib/utils";

export type ExplorerMenuPanelVariant = "default" | "create" | "folderContext";

interface ExplorerMenuPanelProps extends React.ComponentPropsWithoutRef<
  typeof DropdownMenuContent
> {
  actions: MenuAction[];
  closeMenu?: () => void;
  variant?: ExplorerMenuPanelVariant;
}

const DANGER_ITEM_CLASS =
  "ds-floating-panel__row--danger ds-menu__item--danger";

const CREATE_MENU_CONTENT_CLASS =
  "!w-max !min-w-[136px] !max-w-[calc(100vw-16px)] !rounded-[10px] !border !border-border !bg-popover !p-[3px] !shadow-[0_8px_24px_rgba(15,23,42,0.12)]";

const CREATE_MENU_ITEM_CLASS =
  "!h-[26px] !min-h-[26px] !cursor-pointer !rounded-[8px] !px-2 !py-0 text-[12.5px] font-normal !leading-[26px] text-foreground transition-colors duration-75 hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent active:bg-accent/80 overflow-hidden whitespace-nowrap";

const CREATE_MENU_ICON_CLASS =
  "flex h-full w-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0";

const CREATE_MENU_SEPARATOR_CLASS = "!mx-0 !my-[3px] !h-px !bg-border";

const FOLDER_CONTEXT_MENU_CONTENT_CLASS =
  "!w-max !min-w-[136px] !max-w-[calc(100vw-16px)] !rounded-[10px] !border !border-border !bg-popover !p-[3px] !shadow-[0_8px_24px_rgba(15,23,42,0.12)]";

const FOLDER_CONTEXT_MENU_ITEM_CLASS =
  "!h-[26px] !min-h-[26px] !cursor-pointer !rounded-[8px] !px-2 !py-0 text-[12.5px] font-normal !leading-[26px] text-foreground transition-colors duration-75 hover:bg-accent focus:bg-accent data-[highlighted]:bg-accent active:bg-accent/80 overflow-hidden whitespace-nowrap";

const FOLDER_CONTEXT_MENU_ICON_CLASS =
  "flex h-full w-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0";

const FOLDER_CONTEXT_MENU_DANGER_ITEM_CLASS =
  "!text-[#b91c1c] hover:!bg-[#fef2f2] focus:!bg-[#fef2f2] data-[highlighted]:!bg-[#fef2f2] active:!bg-[#fee2e2] [&_svg]:!stroke-[#b91c1c]";

const FOLDER_CONTEXT_MENU_SEPARATOR_CLASS = "!mx-0 !my-[3px] !h-px !bg-border";

const PLAIN_MENU_CONTENT_STYLE = {
  fontFamily: "var(--explorer-chrome-font-family)",
  fontFeatureSettings: "\"palt\" 1, \"lnum\" 1, \"tnum\" 1",
  fontVariationSettings: "\"opsz\" 14",
  textRendering: "auto",
} satisfies React.CSSProperties;

const PLAIN_MENU_ROW_STYLE = {
  height: 26,
  minHeight: 26,
  lineHeight: "26px",
  gap: 6,
  fontSize: "12.5px",
} satisfies React.CSSProperties;

const PLAIN_MENU_LABEL_CLASS =
  "flex h-full min-w-0 flex-1 items-center truncate pr-1 text-left leading-[26px]";

/**
 * エクスプローラーの各種メニュー（追加ボタン、コンテキストメニュー）で共有されるパネルコンポーネント
 */
export const ExplorerMenuPanel = ({
  actions,
  closeMenu,
  className,
  variant = "default",
  style,
  ...contentProps
}: ExplorerMenuPanelProps) => {
  const visibleActions = actions.filter((action) => !action.hidden);
  const panelPreset = floatingPanelPresets.menu;
  const isCreateVariant = variant === "create";
  const isFolderContextVariant = variant === "folderContext";
  const isPlainVariant = isCreateVariant || isFolderContextVariant;

  const contentClassName = isFolderContextVariant
    ? FOLDER_CONTEXT_MENU_CONTENT_CLASS
    : isCreateVariant
      ? CREATE_MENU_CONTENT_CLASS
      : cn("w-48", panelPreset.className);

  const itemClassName = isFolderContextVariant
    ? FOLDER_CONTEXT_MENU_ITEM_CLASS
    : isCreateVariant
      ? CREATE_MENU_ITEM_CLASS
      : undefined;

  const iconClassName = isFolderContextVariant
    ? FOLDER_CONTEXT_MENU_ICON_CLASS
    : isCreateVariant
      ? CREATE_MENU_ICON_CLASS
      : undefined;

  const separatorClassName = isFolderContextVariant
    ? FOLDER_CONTEXT_MENU_SEPARATOR_CLASS
    : isCreateVariant
      ? CREATE_MENU_SEPARATOR_CLASS
      : undefined;

  return (
    <DropdownMenuContent
      className={cn(contentClassName, className)}
      surface={isPlainVariant ? "plain" : panelPreset.surface}
      style={
        isPlainVariant
          ? {
            ...PLAIN_MENU_CONTENT_STYLE,
            ...style,
          }
          : style
      }
      {...contentProps}
    >
      {visibleActions.map((action, index) => (
        <React.Fragment key={action.id}>
          {action.separatorBefore && index > 0 ? (
            <DropdownMenuSeparator className={cn(separatorClassName)} />
          ) : null}

          <DropdownMenuItem
            disabled={action.disabled}
            className={cn(
              itemClassName,
              action.danger &&
                (isFolderContextVariant
                  ? FOLDER_CONTEXT_MENU_DANGER_ITEM_CLASS
                  : DANGER_ITEM_CLASS),
            )}
            style={isPlainVariant ? PLAIN_MENU_ROW_STYLE : undefined}
            onSelect={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMenu?.();
              void action.onSelect?.();
            }}
          >
            {action.icon ? (
              <DropdownMenuItemIcon className={cn(iconClassName)}>
                {action.icon}
              </DropdownMenuItemIcon>
            ) : null}
            <DropdownMenuItemLabel
              className={cn(
                isPlainVariant ? PLAIN_MENU_LABEL_CLASS : undefined,
              )}
            >
              {action.label}
            </DropdownMenuItemLabel>
          </DropdownMenuItem>
        </React.Fragment>
      ))}
    </DropdownMenuContent>
  );
};
