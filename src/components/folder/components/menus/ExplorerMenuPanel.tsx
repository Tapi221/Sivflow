import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { glassMenuContentClass } from "@/components/ui/menu-styles";
import { cn } from "@/lib/utils";
import React from "react";
import type { MenuAction } from "./menuActions";

interface ExplorerMenuPanelProps extends React.ComponentPropsWithoutRef<
  typeof DropdownMenuContent
> {
  actions: MenuAction[];
  closeMenu?: () => void;
}

const DANGER_ITEM_CLASS = "text-red-600 focus:bg-red-50 focus:text-red-700";

/**
 * エクスプローラーの各種メニュー（追加ボタン、コンテキストメニュー）で共有されるパネルコンポーネント
 */
export const ExplorerMenuPanel = ({
  actions,
  closeMenu,
  className,
  ...contentProps
}: ExplorerMenuPanelProps) => {
  const visibleActions = actions.filter((action) => !action.hidden);

  return (
    <DropdownMenuContent
      className={cn("w-48", glassMenuContentClass, className)}
      {...contentProps}
    >
      {visibleActions.map((action, index) => (
        <React.Fragment key={action.id}>
          {action.separatorBefore && index > 0 ? (
            <DropdownMenuSeparator />
          ) : null}

          <DropdownMenuItem
            disabled={action.disabled}
            className={cn(action.danger && DANGER_ITEM_CLASS)}
            onSelect={(event) => {
              // デフォルトの挙動（メニューを閉じる）を制御するために preventDefault / stopPropagation を使用
              event.preventDefault();
              event.stopPropagation();
              closeMenu?.();
              void action.onSelect?.();
            }}
          >
            {action.icon ? (
              <DropdownMenuItemIcon>{action.icon}</DropdownMenuItemIcon>
            ) : null}
            <DropdownMenuItemLabel>{action.label}</DropdownMenuItemLabel>
          </DropdownMenuItem>
        </React.Fragment>
      ))}
    </DropdownMenuContent>
  );
};
