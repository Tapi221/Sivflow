import { ExplorerSidebarHeader } from "@/components/explorer/ExplorerSidebarHeader";
import { cn } from "@/lib/utils";
import React from "react";

interface TreeViewSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  isSidebarOpen: boolean;
  isResizing: boolean;
  showMobileDetail: boolean;
  allTags: string[];
  onCreateRootFolder: () => void;
  onCreateCardSet: () => void;
  onAddDocument: () => void;
  onBulkImport: () => void;
  onStartResizing: (e: React.PointerEvent) => void;
  children: React.ReactNode;
  canCreateCardSet?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
}

export const TreeViewSidebar = ({
  sidebarRef,
  contentScrollRef,
  isSidebarOpen,
  isResizing,
  showMobileDetail,
  allTags,
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
      style={{ backgroundColor: "var(--sidebar-bg)" }}
      className={cn(
        "relative z-10 flex-col border-r border-[var(--sidebar-border,#e3e6ea)] group/sidebar select-none",
        "shrink-0",
        showMobileDetail ? "hidden md:flex" : "flex",
        "transition-none",
        isResizing && "will-change-[width]",
        "w-[100dvw] max-w-[100dvw] md:w-auto md:max-w-none",
        !isSidebarOpen &&
          "md:w-0 md:border-0 md:overflow-hidden md:shadow-none",
      )}
    >
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <div className="shrink-0">
          <ExplorerSidebarHeader
            allTags={allTags}
            onCreateRootFolder={onCreateRootFolder}
            onCreateCardSet={onCreateCardSet}
            onAddDocument={onAddDocument}
            onBulkImport={onBulkImport}
            canCreateCardSet={canCreateCardSet}
            canAddDocuments={canAddDocuments}
            canBulkImport={canBulkImport}
            preferDirectRootFolderCreate={preferDirectRootFolderCreate}
          />
        </div>

        <div
          ref={contentScrollRef}
          className="flex-1 min-h-0 min-w-0 overflow-hidden outline-none"
        >
          {children}
        </div>
      </div>

      {isSidebarOpen && (
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
      )}
    </div>
  );
};