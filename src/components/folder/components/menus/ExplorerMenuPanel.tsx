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

interface ExplorerMenuPanelProps
  extends React.ComponentPropsWithoutRef<typeof DropdownMenuContent> {
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
  "!w-[287px] !rounded-[16px] !border !border-[#e5e8f0] !bg-white !p-[14px] !shadow-[0_14px_40px_rgba(15,23,42,0.10),0_2px_8px_rgba(15,23,42,0.06)]";

const FOLDER_CONTEXT_MENU_ITEM_CLASS =
  "!h-[41px] !cursor-pointer gap-[14px] !rounded-[9px] !px-1.5 !py-0 text-[20px] font-normal leading-none text-[#222222] transition-colors duration-75 hover:bg-[#f6f7fb] focus:bg-[#f6f7fb] data-[highlighted]:bg-[#f6f7fb] active:bg-[#eef1f6] overflow-hidden whitespace-nowrap";

const FOLDER_CONTEXT_MENU_ICON_CLASS =
  "h-[20px] w-[20px] text-[#222222] [&>svg]:h-[20px] [&>svg]:w-[20px] [&>svg]:shrink-0";

const FOLDER_CONTEXT_MENU_DANGER_ITEM_CLASS =
  "text-[#222222] hover:bg-[#f6f7fb] focus:bg-[#f6f7fb] data-[highlighted]:bg-[#f6f7fb] active:bg-[#eef1f6]";

const FOLDER_CONTEXT_MENU_DANGER_ICON_CLASS =
  "text-[#222222] [&>svg]:stroke-[#222222]";

const FOLDER_CONTEXT_MENU_SEPARATOR_CLASS =
  "!mx-0 !my-[6px] !h-px !bg-[#e5e8f0]";

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
      surface={
        isCreateVariant || isFolderContextVariant ? "plain" : panelPreset.surface
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
            onSelect={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMenu?.();
              void action.onSelect?.();
            }}
          >
            {action.icon ? (
              <DropdownMenuItemIcon
                className={cn(
                  iconClassName,
                  isFolderContextVariant &&
                    action.danger &&
                    FOLDER_CONTEXT_MENU_DANGER_ICON_CLASS,
                )}
              >
                {action.icon}
              </DropdownMenuItemIcon>
            ) : null}
            <DropdownMenuItemLabel
              className={cn(
                (isCreateVariant || isFolderContextVariant) && "truncate",
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
