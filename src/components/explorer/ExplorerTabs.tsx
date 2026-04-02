/**
 * ExplorerTabs - Explorerタブ切替UIコンポーネント
 * Linear/Notion 系のテキストリンクスタイル
 */
import React, { useRef, useState } from "react";
import { FileText, Folder, Plus } from "@/ui/icons";
import type { ExplorerTab } from "@/components/folder/explorer/model/types";
import { cn } from "@/lib/utils";
import { TagFilterPopover } from "./TagFilterPopover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExplorerTabsProps {
  activeTab: ExplorerTab;
  onTabChange: (tab: ExplorerTab) => void;
  allTags: string[];
  onCreateRootFolder?: () => void | Promise<void>;
  onCreateCardSet?: () => void | Promise<void>;
  onAddPdf?: () => void | Promise<void>;
  onAddPptx?: () => void | Promise<void>;
  showExplorerActions?: boolean;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
}

const TABS: { id: ExplorerTab; label: string }[] = [
  { id: "explorer", label: "フォルダ" },
  { id: "pinned", label: "ピン" },
  { id: "views", label: "ビュー" },
  { id: "recent", label: "最近" },
];

export function ExplorerTabs({
  activeTab,
  onTabChange,
  allTags,
  onCreateRootFolder,
  onCreateCardSet,
  onAddPdf,
  onAddPptx,
  showExplorerActions = false,
  canCreateCardSet = false,
  canAddDocuments = false,
}: ExplorerTabsProps) {
  const shouldShowExplorerActions =
    showExplorerActions && activeTab === "explorer";
  const suppressCloseAutoFocusRef = useRef(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  return (
    <div
      className="flex items-center justify-between pl-10 pr-2"
      style={{
        height: 36,
        borderBottom: "1px solid var(--pane-border, #e8e8e8)",
        backgroundColor: "var(--sidebar-bg)",
      }}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "relative px-2.5 h-full flex items-center whitespace-nowrap transition-colors duration-100",
                "text-[12px] font-medium",
                isActive
                  ? "text-[var(--text-primary,#1a1a1a)]"
                  : "text-[var(--text-muted,#8a8a8a)] hover:text-[var(--text-secondary,#4b4b4b)]",
              )}
              style={{ height: 36 }}
            >
              {tab.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 6,
                    right: 6,
                    height: 1.5,
                    borderRadius: 2,
                    background: "var(--sidebar-active-accent, #7aa6a1)",
                  }}
                />
              )}
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
            className="w-44 rounded-[12px] border border-slate-200/80 bg-white/82 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md"
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
              className="gap-2"
            >
              <Folder className="h-4 w-4" />
              新規フォルダ
            </DropdownMenuItem>

            {canCreateCardSet && (
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  suppressCloseAutoFocusRef.current = true;
                  setCreateMenuOpen(false);
                  void onCreateCardSet?.();
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                新規カードセット
              </DropdownMenuItem>
            )}

            {canAddDocuments && (
              <>
                <DropdownMenuItem
                  onSelect={() => void onAddPdf?.()}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF追加
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => void onAddPptx?.()}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PPTX追加
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <TagFilterPopover allTags={allTags} />
      </div>
    </div>
  );
}



