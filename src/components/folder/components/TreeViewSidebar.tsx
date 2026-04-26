import { ExplorerSidebarHeader } from "@/components/explorer/ExplorerSidebarHeader";
import { cn } from "@/lib/utils";
import React from "react";

interface TreeViewSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  contentScrollRef: React.RefObject<HTMLDivElement | null>;
  isSidebarOpen: boolean;
  renderedSidebarWidth: number;
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
  canCreateCard?: boolean;
  canAddDocuments?: boolean;
  canBulkImport?: boolean;
  preferDirectRootFolderCreate?: boolean;
  collapseContent?: boolean;
  collapsedContent?: React.ReactNode;
  rightGapPx?: number;
  integratedChrome?: boolean;
}

export const TreeViewSidebar = ({
  sidebarRef,
  contentScrollRef,
  isSidebarOpen,
  renderedSidebarWidth,
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
  canCreateCard = false,
  canAddDocuments = false,
  canBulkImport = false,
  preferDirectRootFolderCreate = false,
  collapseContent = false,
  collapsedContent,
  rightGapPx = 0,
  integratedChrome = false,
}: TreeViewSidebarProps) => {
  return (
    <div
      ref={sidebarRef}
      style={{
        width: isSidebarOpen ? renderedSidebarWidth : 0,
        minWidth: isSidebarOpen ? renderedSidebarWidth : 0,
        marginRight: isSidebarOpen ? rightGapPx : 0,
      }}
      className={cn(
        "relative z-10 flex-col group/sidebar select-none",
        "shrink-0",
        showMobileDetail ? "hidden md:flex" : "flex",
        "transition-none",
        isResizing && "will-change-[width]",
        "w-[100dvw] max-w-[100dvw] md:max-w-none",
        !isSidebarOpen &&
          "md:w-0 md:border-0 md:overflow-hidden md:shadow-none",
      )}
    >
      <div
        className={cn(
          "explorer-chrome-font flex h-full min-h-0 w-full flex-col overflow-hidden",
          "[--sidebar-text:#4b5563]",
          "[--sidebar-text-muted:#888780] [--sidebar-icon-active:#888780]",
          integratedChrome
            ? "border-r border-[#e6e4dc] bg-transparent"
            : [
                "md:rounded-[14px] md:border md:border-[#dddcd5]",
                "md:bg-[rgba(255,255,255,0.92)]",
                "md:shadow-[0_16px_36px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]",
              ],
        )}
      >
        <div className="shrink-0">
          <ExplorerSidebarHeader
            allTags={allTags}
            onCreateRootFolder={onCreateRootFolder}
            onCreateCardSet={onCreateCardSet}
            onAddDocument={onAddDocument}
            onBulkImport={onBulkImport}
            canCreateCardSet={canCreateCardSet}
            canCreateCard={canCreateCard}
            canAddDocuments={canAddDocuments}
            canBulkImport={canBulkImport}
            preferDirectRootFolderCreate={preferDirectRootFolderCreate}
          />
        </div>

        {collapseContent ? (
          <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
            {collapsedContent}
          </div>
        ) : (
          <div
            ref={contentScrollRef}
            className="flex-1 min-h-0 min-w-0 overflow-hidden px-1 pb-1 outline-none"
          >
            {children}
          </div>
        )}
      </div>

      {isSidebarOpen && (
        <div
          className={cn(
            "absolute top-2 -right-[4px] z-50 hidden h-[calc(100%-16px)] w-2 cursor-col-resize select-none outline-none md:block group/resize",
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
