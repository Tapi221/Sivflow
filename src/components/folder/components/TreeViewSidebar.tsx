import React from "react";
import { cn } from "@web-renderer/lib/utils";



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



const EXPLORER_SIDEBAR_TITLEBAR_OFFSET_VAR =
  "--mf-explorer-sidebar-titlebar-offset";
const INTEGRATED_CHROME_SIDEBAR_GAP_PX = 20;



const TreeViewSidebar = ({ sidebarRef, contentScrollRef, isSidebarOpen, renderedSidebarWidth, isResizing, showMobileDetail, allTags, onCreateRootFolder, onCreateCardSet, onAddDocument, onBulkImport, onStartResizing, children, canCreateCardSet = false, canCreateCard = false, canAddDocuments = false, canBulkImport = false, preferDirectRootFolderCreate = false, collapseContent = false, collapsedContent, rightGapPx = 0, integratedChrome = false }: TreeViewSidebarProps) => {
  void allTags;
  void onCreateRootFolder;
  void onCreateCardSet;
  void onAddDocument;
  void onBulkImport;
  void canCreateCardSet;
  void canCreateCard;
  void canAddDocuments;
  void canBulkImport;
  void preferDirectRootFolderCreate;

  const sidebarGapPx = integratedChrome
    ? Math.max(rightGapPx, INTEGRATED_CHROME_SIDEBAR_GAP_PX)
    : rightGapPx;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (!integratedChrome) return;

    const offsetPx = isSidebarOpen
      ? Math.max(0, Math.round(renderedSidebarWidth + sidebarGapPx))
      : 0;

    document.documentElement.style.setProperty(
      EXPLORER_SIDEBAR_TITLEBAR_OFFSET_VAR,
      `${offsetPx}px`,
    );

    return () => {
      document.documentElement.style.removeProperty(
        EXPLORER_SIDEBAR_TITLEBAR_OFFSET_VAR,
      );
    };
  }, [integratedChrome, isSidebarOpen, renderedSidebarWidth, sidebarGapPx]);

  const sidebarContent = collapseContent ? collapsedContent : children;

  return (
    <div
      ref={sidebarRef}
      data-explorer-sidebar-shell={integratedChrome ? "true" : undefined}
      style={{
        width: isSidebarOpen ? renderedSidebarWidth : 0,
        minWidth: isSidebarOpen ? renderedSidebarWidth : 0,
        marginRight: isSidebarOpen ? sidebarGapPx : 0,
        boxSizing: "border-box",
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
        data-explorer-sidebar-panel={integratedChrome ? "true" : undefined}
        className={cn(
          "flex h-full min-h-0 w-full flex-col overflow-hidden",
          integratedChrome
            ? "bg-[rgba(255,255,255,0.92)]"
            : [
              "md:rounded-2xl md:border md:border-stone-300",
              "md:bg-[rgba(255,255,255,0.92)]",
              "md:shadow-[0_16px_36px_rgba(15,23,42,0.06),0_4px_12px_rgba(15,23,42,0.04)]",
            ],
        )}
      >
        <div
          ref={collapseContent ? undefined : contentScrollRef}
          className={cn(
            "flex-1 min-h-0 min-w-0 overflow-hidden outline-none",
            collapseContent ? undefined : "px-1 pb-1",
          )}
        >
          {sidebarContent}
        </div>
      </div>

      {isSidebarOpen ? (
        <div
          className={cn(
            "absolute top-0 -right-0.5 z-50 hidden h-full w-1.5 select-none bg-transparent outline-none md:block",
          )}
          onPointerDown={onStartResizing}
          role="separator"
          aria-label="サイドバーのサイズ変更"
          tabIndex={0}
          style={{ cursor: "col-resize", touchAction: "none" }}
        />
      ) : null}
    </div>
  );
};



export { TreeViewSidebar };
