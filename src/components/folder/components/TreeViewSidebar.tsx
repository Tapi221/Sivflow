import { ExplorerTabs } from "@/components/explorer/ExplorerTabs";
import { ExplorerFilterSummary } from "@/components/folder/components/explorer/ExplorerFilterSummary";
import type { ExplorerTab } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import React from "react";

interface TreeViewSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  sidebarWidth: number;
  isSidebarOpen: boolean;
  isMobile: boolean;
  isResizing: boolean;
  showMobileDetail: boolean;
  explorerTab: ExplorerTab;
  setExplorerTab: (tab: ExplorerTab) => void;
  allTags: string[];
  getTagColor: (tagName: string) => string | undefined;
  isFilterActive: boolean;
  resultCount: number;
  onCreateRootFolder: () => void;
  onCreateCardSet: () => void;
  onAddDocument: () => void;
  onBulkImport: () => void;
  onStartResizing: (event: React.PointerEvent) => void;
  children: React.ReactNode;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
}

export const TreeViewSidebar = ({
  sidebarRef,
  contentScrollRef,
  sidebarWidth,
  isSidebarOpen,
  isMobile,
  isResizing,
  showMobileDetail,
  explorerTab,
  setExplorerTab,
  allTags,
  getTagColor,
  isFilterActive,
  resultCount,
  onCreateRootFolder,
  onCreateCardSet,
  onAddDocument,
  onBulkImport,
  onStartResizing,
  children,
  canCreateCardSet = false,
  canAddDocuments = false,
  canBulkImport = false,
  preferDirectRootFolderCreate = false,
}: TreeViewSidebarProps) => {
  return (
    <div
      ref={sidebarRef}
      data-testid="explorer-sidebar"
      style={{
        backgroundColor: "var(--sidebar-bg)",
        ...(isMobile
          ? {}
          : {
              width: isSidebarOpen ? `${sidebarWidth}px` : "0px",
            }),
      }}
      className={cn(
        "relative z-10 flex-col border-r border-[var(--sidebar-border,#e3e6ea)] group/sidebar select-none",
        "shrink-0",
        showMobileDetail ? "hidden md:flex" : "flex",
        "transition-none",
        isResizing && "will-change-[width]",
        "w-[100dvw] max-w-[100dvw] md:max-w-none",
        !isSidebarOpen &&
          "md:border-0 md:overflow-hidden md:shadow-none",
      )}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <ExplorerTabs
            activeTab={explorerTab}
            onTabChange={setExplorerTab}
            allTags={allTags}
            onCreateRootFolder={onCreateRootFolder}
            onCreateCardSet={onCreateCardSet}
            onAddDocument={onAddDocument}
            onBulkImport={onBulkImport}
            showExplorerActions={explorerTab === "explorer"}
            canCreateCardSet={canCreateCardSet}
            canAddDocuments={canAddDocuments}
            canBulkImport={canBulkImport}
            preferDirectRootFolderCreate={preferDirectRootFolderCreate}
          />
        </div>

        <div className="shrink-0">
          <ExplorerFilterSummary
            getTagColor={(tag) => getTagColor(tag) || "bg-slate-200"}
            isFilterActive={isFilterActive}
            resultCount={resultCount}
          />
        </div>

        <div
          ref={contentScrollRef}
          className="flex-1 min-h-0 min-w-0 overflow-hidden outline-none"
        >
          {children}
        </div>
      </div>

      {isSidebarOpen && !isMobile ? (
        <div
          className={cn(
            "absolute top-0 -right-[3px] z-50 hidden h-full w-1.5 cursor-col-resize select-none outline-none md:block group/resize",
            "hover:bg-[color-mix(in_srgb,var(--sidebar-text-muted,#6e6e80)_20%,transparent)]",
            isResizing &&
              "bg-[color-mix(in_srgb,var(--sidebar-text-muted,#6e6e80)_30%,transparent)]",
          )}
          onPointerDown={onStartResizing}
          role="separator"
          aria-label="サイドバーのサイズ変更"
          tabIndex={0}
          style={{ touchAction: "none" }}
        />
      ) : null}
    </div>
  );
};
