import { ExplorerTabs } from "@/components/explorer/ExplorerTabs";
import { ExplorerFilterSummary } from "@/components/folder/components/explorer/ExplorerFilterSummary";
import type { ExplorerTab } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import React from "react";

interface TreeViewSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  isSidebarOpen: boolean;
  isResizing: boolean;
  showMobileDetail: boolean;
  explorerTab: ExplorerTab;
  setExplorerTab: (tab: ExplorerTab) => void;
  allTags: string[];
  getTagColor: (tagName: string) => string | undefined;
  isFilterActive: boolean;
  resultCount: number;
  onCreateRootFolder: () => void;
  onStartResizing: (e: React.PointerEvent) => void;
  children: React.ReactNode;
}

export function TreeViewSidebar({
  sidebarRef,
  contentScrollRef,
  isSidebarOpen,
  isResizing,
  showMobileDetail,
  explorerTab,
  setExplorerTab,
  allTags,
  getTagColor,
  isFilterActive,
  resultCount,
  onCreateRootFolder,
  onStartResizing,
  children,
}: TreeViewSidebarProps) {
  return (
    <div
      ref={sidebarRef}
      style={{ backgroundColor: "var(--sidebar-bg)" }}
      className={cn(
        "shrink-0 flex-col border-r border-[var(--sidebar-border,#e3e6ea)] relative z-10 group/sidebar select-none",
        showMobileDetail ? "hidden md:flex" : "flex",
        isResizing
          ? "transition-none will-change-[width]"
          : "transition-all duration-300 ease-in-out",
        "w-[100dvw] max-w-[100dvw] md:w-auto md:max-w-none",
        !isSidebarOpen &&
          "md:w-0 md:border-0 md:overflow-hidden md:shadow-none",
      )}
    >
      <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
        <div className="shrink-0">
          <ExplorerTabs
            activeTab={explorerTab}
            onTabChange={setExplorerTab}
            allTags={allTags}
            onCreateRootFolder={onCreateRootFolder}
            showExplorerActions={explorerTab === "explorer"}
          />
        </div>

        <div className="shrink-0">
          <ExplorerFilterSummary
            getTagColor={getTagColor}
            isFilterActive={isFilterActive}
            resultCount={resultCount}
          />
        </div>

        <div
          ref={contentScrollRef}
          className={cn(
            "flex-1 min-h-0 outline-none min-w-0",
            explorerTab === "explorer" ? "overflow-hidden" : "overflow-y-auto",
          )}
        >
          {children}
        </div>
      </div>

      {isSidebarOpen && (
        <div
          className={cn(
            "hidden md:block absolute top-0 -right-[3px] w-1.5 h-full cursor-col-resize z-50 group/resize select-none outline-none transition-colors hover:bg-[color-mix(in_srgb,var(--sidebar-text-muted,#6e6e80)_20%,transparent)] focus-visible:outline-none",
            isResizing &&
              "bg-[color-mix(in_srgb,var(--sidebar-text-muted,#6e6e80)_30%,transparent)]",
          )}
          onPointerDown={onStartResizing}
          role="separator"
          aria-label="サイドバーのサイズ変更"
          tabIndex={0}
          style={{ touchAction: "none" }}
        >
          <div
            className={cn(
              "absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full transition-colors",
              "bg-[var(--sidebar-border,#e3e6ea)] group-hover/resize:bg-[var(--sidebar-text-muted,#6e6e80)]",
              isResizing && "bg-[var(--sidebar-text,#202123)]",
            )}
          />
        </div>
      )}
    </div>
  );
}



