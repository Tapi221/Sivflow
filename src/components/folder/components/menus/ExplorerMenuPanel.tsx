import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { floatingPanelPresets } from "@/components/ui/menu-styles";
import { cn } from "@/lib/utils";
import React from "react";
import type { MenuAction } from "./menuActions";

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
  "!w-[148px] !rounded-[10px] !border !border-[#dddcd5] !bg-white !p-[3px] !shadow-[0_4px_20px_rgba(0,0,0,0.09),0_1px_3px_rgba(0,0,0,0.05)]";

const CREATE_MENU_ITEM_CLASS =
  "!h-8 !cursor-pointer gap-[7px] !rounded-[5px] !px-2 !py-0 text-[13px] font-normal leading-none text-[#1a1a18] transition-colors duration-75 hover:bg-[#f1efe8] focus:bg-[#f1efe8] data-[highlighted]:bg-[#f1efe8] active:bg-[#eae8e0] overflow-hidden whitespace-nowrap";

const CREATE_MENU_ICON_CLASS =
  "h-[15px] w-[15px] text-[#888780] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:stroke-[#888780] [&>svg]:stroke-[1.5]";

const CREATE_MENU_SEPARATOR_CLASS = "!mx-0 !my-[3px] !h-px !bg-[#e5e4dd]";

const FOLDER_CONTEXT_MENU_CONTENT_CLASS =
  "!w-[160px] !rounded-[10px] !border !border-[#dddcd5] !bg-white !p-[3px] !shadow-[0_4px_20px_rgba(0,0,0,0.09),0_1px_3px_rgba(0,0,0,0.05)]";

const FOLDER_CONTEXT_MENU_ITEM_CLASS =
  "!h-8 !cursor-pointer gap-[7px] !rounded-[5px] !px-2 !py-0 text-[13px] font-normal leading-none text-[#1a1a18] transition-colors duration-75 hover:bg-[#f1efe8] focus:bg-[#f1efe8] data-[highlighted]:bg-[#f1efe8] active:bg-[#eae8e0] overflow-hidden whitespace-nowrap";

const FOLDER_CONTEXT_MENU_ICON_CLASS =
  "h-[15px] w-[15px] text-[#888780] [&>svg]:h-[15px] [&>svg]:w-[15px] [&>svg]:shrink-0 [&>svg]:stroke-current";

const FOLDER_CONTEXT_MENU_DANGER_ITEM_CLASS =
  "!text-[#c0392b] hover:!bg-[#fdf0ee] focus:!bg-[#fdf0ee] data-[highlighted]:!bg-[#fdf0ee] active:!bg-[#f9e3df] [&_svg]:!stroke-[#c0392b]";

const FOLDER_CONTEXT_MENU_SEPARATOR_CLASS =
  "!mx-0 !my-[3px] !h-px !bg-[#e5e4dd]";

/**
 * エクスプローラーの各種メニュー（追加ボタン、コンテキストメニュー）で共有されるパネルコンポーネント
 */
export const ExplorerMenuPanel = ({
  actions,
  closeMenu,
  className,
  variant = "default",
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
            <DropdownMenuItemLabel className={cn(isPlainVariant && "truncate")}>
              {action.label}
            </DropdownMenuItemLabel>
          </DropdownMenuItem>
        </React.Fragment>
      ))}
    </DropdownMenuContent>
  );
};
