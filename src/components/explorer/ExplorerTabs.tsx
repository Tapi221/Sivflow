/**
 * ExplorerTabs - Explorerタブ切替UIコンポーネント
 * Linear/Notion 系のテキストリンクスタイル
 */
import React, { useMemo, useRef, useState } from "react";
import { Folder, History, Plus } from "@/ui/icons";
import type { ExplorerTab } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { SidebarNavIcon } from "@/layout/sidebarNavItem";
import { getSidebarNavItemClassName } from "@/layout/sidebarNavItem.utils";
import { TagFilterPopover } from "./TagFilterPopover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExplorerMenuPanel } from "@/components/folder/components/menus/ExplorerMenuPanel";
import { buildExplorerCreateMenuActions } from "@/components/folder/components/menus/explorerMenuActionBuilders";

interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  allTags: string[];
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  onBulkImport?: () => void | Promise<void>;
  showExplorerActions?: boolean;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
}

const TABS: {
  id: ExplorerTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "explorer", label: "フォルダ", icon: Folder },
  { id: "recent", label: "最近", icon: History },
];

export const ExplorerTabs = ({
  activeTab,
  onTabChange,
  allTags,
  onCreateRootFolder,
  onCreateCardSet,
  onAddDocument,
  onBulkImport,
  showExplorerActions = false,
  canCreateCardSet = false,
  canAddDocuments = false,
  canBulkImport = false,
  preferDirectRootFolderCreate = false,
}: ExplorerTabsProps) => {
  const shouldShowExplorerActions =
    showExplorerActions && activeTab === "explorer";
  const suppressCloseAutoFocusRef = useRef(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const createMenuActions = useMemo(
    () =>
      buildExplorerCreateMenuActions({
        canCreateCardSet,
        canAddDocuments,
        canBulkImport,
        onCreateRootFolder,
        onCreateCardSet,
        onAddDocument,
        onBulkImport,
      }),
    [
      canAddDocuments,
      canBulkImport,
      canCreateCardSet,
      onAddDocument,
      onBulkImport,
      onCreateCardSet,
      onCreateRootFolder,
    ],
  );

  return (
    <div
      className="ds-nav-tabs flex items-center justify-between px-2"
      style={{
        height: 36,
      }}
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`explorer-tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={getSidebarNavItemClassName({
                isActive,
                className: "ds-nav-tab relative justify-center gap-0 px-0",
              })}
            >
              <SidebarNavIcon className="ds-nav-tab__icon opacity-100">
                <Icon className="h-3.5 w-3.5" />
              </SidebarNavIcon>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "flex items-center gap-0.5 flex-shrink-0 transition-all duration-150",
          shouldShowExplorerActions
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
        aria-hidden={!shouldShowExplorerActions}
      >
        {shouldShowExplorerActions &&
        preferDirectRootFolderCreate &&
        Boolean(onCreateRootFolder) &&
        !canCreateCardSet &&
        !canAddDocuments ? (
          <button
            type="button"
            title="新規フォルダを追加"
            aria-label="新規フォルダを追加"
            className="ds-nav-action ds-nav-action--icon flex items-center"
            onClick={() => {
              void onCreateRootFolder?.();
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        ) : (
          <DropdownMenu
            modal={false}
            open={createMenuOpen}
            onOpenChange={(open) => {
              setCreateMenuOpen(open);
              if (!open && !suppressCloseAutoFocusRef.current) {
                suppressCloseAutoFocusRef.current = false;
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="追加"
                aria-label="追加メニューを開く"
                className="ds-nav-action ds-nav-action--icon flex items-center"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <ExplorerMenuPanel
              actions={createMenuActions}
              align="end"
              className="w-44"
              closeMenu={() => {
                suppressCloseAutoFocusRef.current = true;
                setCreateMenuOpen(false);
              }}
              onCloseAutoFocus={(event) => {
                if (!suppressCloseAutoFocusRef.current) return;
                suppressCloseAutoFocusRef.current = false;
                event.preventDefault();
              }}
            />
          </DropdownMenu>
        )}
        <TagFilterPopover allTags={allTags} />
      </div>
    </div>
  );
};
