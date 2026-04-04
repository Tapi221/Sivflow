/**
 * ExplorerTabs - Explorerタブ切替UIコンポーネント
 * Linear/Notion 系のテキストリンクスタイル
 */
import React, { useRef, useState } from "react";
import { FileText, Folder, History, Plus } from "@/ui/icons";
import type { ExplorerTab } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import { SidebarNavIcon } from "@/layout/sidebarNavItem";
import { getSidebarNavItemClassName } from "@/layout/sidebarNavItem.utils";
import { TagFilterPopover } from "./TagFilterPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuItemIcon,
  DropdownMenuItemLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { glassMenuContentClass } from "@/components/ui/menu-styles";

interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  allTags: string[];
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddDocument?: () => void | Promise<void>;
  showExplorerActions?: boolean;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
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
  showExplorerActions = false,
  canCreateCardSet = false,
  canAddDocuments = false,
}: ExplorerTabsProps) => {
  const shouldShowExplorerActions =
    showExplorerActions && activeTab === "explorer";
  const suppressCloseAutoFocusRef = useRef(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  return (
    <div
      className="flex items-center justify-between px-2"
      style={{
        height: 36,
        borderBottom: "1px solid var(--pane-border, #e8e8e8)",
        backgroundColor: "var(--sidebar-bg)",
      }}
    >
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-label={tab.label}
              className={getSidebarNavItemClassName({
                isActive,
                className:
                  "relative h-8 min-w-8 justify-center gap-0 px-0 text-[var(--sidebar-text-muted,#6e6e80)]",
              })}
            >
              <SidebarNavIcon className="opacity-100">
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
              className="flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted,#8a8a8a)] hover:text-[var(--text-secondary,#4b4b4b)] hover:bg-[var(--hover-bg,rgba(0,0,0,0.04))] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className={`w-44 ${glassMenuContentClass}`}
            onCloseAutoFocus={(event) => {
              if (!suppressCloseAutoFocusRef.current) return;
              suppressCloseAutoFocusRef.current = false;
              event.preventDefault();
            }}
          >
            <DropdownMenuItem
              onSelect={(event) => {
                event.preventDefault();
                suppressCloseAutoFocusRef.current = true;
                setCreateMenuOpen(false);
                void onCreateRootFolder?.();
              }}
            >
              <DropdownMenuItemIcon>
                <Folder className="h-4 w-4" />
              </DropdownMenuItemIcon>
              <DropdownMenuItemLabel>新規フォルダ</DropdownMenuItemLabel>
            </DropdownMenuItem>

            {canCreateCardSet && (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  suppressCloseAutoFocusRef.current = true;
                  setCreateMenuOpen(false);
                  void onCreateCardSet?.();
                }}
              >
                <DropdownMenuItemIcon>
                  <Plus className="h-4 w-4" />
                </DropdownMenuItemIcon>
                <DropdownMenuItemLabel>
                  新規カードセット
                </DropdownMenuItemLabel>
              </DropdownMenuItem>
            )}

            {canAddDocuments && (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  suppressCloseAutoFocusRef.current = true;
                  setCreateMenuOpen(false);
                  void onAddDocument?.();
                }}
              >
                <DropdownMenuItemIcon>
                  <FileText className="h-4 w-4" />
                </DropdownMenuItemIcon>
                <DropdownMenuItemLabel>文書追加</DropdownMenuItemLabel>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <TagFilterPopover allTags={allTags} />
      </div>
    </div>
  );
};