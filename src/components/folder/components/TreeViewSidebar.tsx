import { ExplorerSidebarHeader } from "@/components/explorer/ExplorerSidebarHeader";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { useTags } from "@/hooks/settings/useTags";
import { cn } from "@/lib/utils";
import React, { useCallback, useEffect, useMemo } from "react";

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

type ElementWithChildrenProps = {
  children?: React.ReactNode;
  id?: unknown;
  "aria-controls"?: unknown;
};

type InjectionResult = {
  node: React.ReactNode;
  injected: boolean;
};

const runAfterCurrentPointerAction = (callback: () => void) => {
  if (typeof window === "undefined") {
    callback();
    return;
  }

  window.requestAnimationFrame(() => {
    callback();
  });
};

const isElementWithChildren = (
  node: React.ReactNode,
): node is React.ReactElement<ElementWithChildrenProps> => {
  return React.isValidElement<ElementWithChildrenProps>(node);
};

const hasTagSectionToggle = (node: React.ReactNode): boolean => {
  if (!isElementWithChildren(node)) return false;

  if (node.props["aria-controls"] === "tag-sidebar-section-content") {
    return true;
  }

  return React.Children.toArray(node.props.children).some(hasTagSectionToggle);
};

const hasTagSectionContent = (node: React.ReactNode): boolean => {
  if (!isElementWithChildren(node)) return false;

  if (node.props.id === "tag-sidebar-section-content") {
    return true;
  }

  return React.Children.toArray(node.props.children).some(hasTagSectionContent);
};

const injectAfterTagSectionToggle = (
  node: React.ReactNode,
  content: React.ReactNode,
): InjectionResult => {
  if (!isElementWithChildren(node)) {
    return { node, injected: false };
  }

  const children = React.Children.toArray(node.props.children);
  if (children.length === 0) {
    return { node, injected: false };
  }

  let injected = false;
  const nextChildren: React.ReactNode[] = [];

  for (const child of children) {
    if (injected) {
      nextChildren.push(child);
      continue;
    }

    if (hasTagSectionToggle(child)) {
      nextChildren.push(child, content);
      injected = true;
      continue;
    }

    const result = injectAfterTagSectionToggle(child, content);
    nextChildren.push(result.node);
    injected = result.injected;
  }

  if (!injected) {
    return { node, injected: false };
  }

  return {
    node: React.cloneElement(node, undefined, nextChildren),
    injected: true,
  };
};

const toTagDisplayName = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "#";
  return trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
};

const SidebarTagSectionContent = () => {
  const { tags } = useTags();
  const tagFilter = useExplorerStore((state) => state.tagFilter);
  const toggleTag = useExplorerStore((state) => state.toggleTag);
  const isTagSectionCollapsed = useExplorerStore(
    (state) => state.isTagSectionCollapsed,
  );

  const tagItems = useMemo(
    () =>
      [...tags].sort((left, right) =>
        left.name.localeCompare(right.name, "ja"),
      ),
    [tags],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;

    const toggle = document.querySelector<HTMLElement>(
      '[aria-controls="tag-sidebar-section-content"]',
    );
    const counter = toggle?.querySelector<HTMLElement>(".tabular-nums");
    if (!counter) return;

    counter.textContent = String(tagItems.length);
  }, [tagItems.length]);

  if (isTagSectionCollapsed) return null;

  return (
    <div
      key="tag-sidebar-section-content"
      id="tag-sidebar-section-content"
      className="shrink-0 px-2 pb-3 pt-1"
    >
      {tagItems.length > 0 ? (
        <div className="min-h-[96px] max-h-[280px] overflow-y-auto pr-1">
          {tagItems.map((tag) => {
            const displayName = toTagDisplayName(tag.name);
            const isSelected =
              tagFilter.includes(tag.name) || tagFilter.includes(displayName);

            return (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  "group flex h-8 w-full items-center gap-1 rounded-md px-2 text-left",
                  "text-[12px] leading-5 transition",
                  isSelected
                    ? "bg-[#f0efe8] text-foreground"
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                title={displayName}
                onClick={() => toggleTag(tag.name)}
              >
                <span className="min-w-0 flex-1 truncate">{displayName}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="min-h-[96px] px-1 py-2 text-[12px] text-muted-foreground/70">
          タグはまだありません
        </div>
      )}
    </div>
  );
};

const useSidebarChildrenWithTagSection = (children: React.ReactNode) => {
  return useMemo(() => {
    if (hasTagSectionContent(children)) return children;

    return injectAfterTagSectionToggle(
      children,
      <SidebarTagSectionContent key="tag-sidebar-section-content" />,
    ).node;
  }, [children]);
};

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
  const sidebarChildren = useSidebarChildrenWithTagSection(children);

  const handleCreateRootFolder = useCallback(() => {
    runAfterCurrentPointerAction(onCreateRootFolder);
  }, [onCreateRootFolder]);

  const handleCreateCardSet = useCallback(() => {
    runAfterCurrentPointerAction(onCreateCardSet);
  }, [onCreateCardSet]);

  const handleAddDocument = useCallback(() => {
    runAfterCurrentPointerAction(onAddDocument);
  }, [onAddDocument]);

  const handleBulkImport = useCallback(() => {
    runAfterCurrentPointerAction(onBulkImport);
  }, [onBulkImport]);

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
            ? "border-r border-[#dddcd5] bg-[rgba(255,255,255,0.92)]"
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
            onCreateRootFolder={handleCreateRootFolder}
            onCreateCardSet={handleCreateCardSet}
            onAddDocument={handleAddDocument}
            onBulkImport={handleBulkImport}
            canCreateCardSet={canCreateCardSet}
            canCreateCard={canCreateCard}
            canAddDocuments={canAddDocuments}
            canBulkImport={canBulkImport}
            preferDirectRootFolderCreate={preferDirectRootFolderCreate}
            compact={integratedChrome}
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
            {sidebarChildren}
          </div>
        )}
      </div>

      {isSidebarOpen && (
        <div
          className={cn(
            "absolute top-0 right-[-3px] z-50 hidden h-full w-[6px] select-none bg-transparent outline-none md:block",
          )}
          onPointerDown={onStartResizing}
          role="separator"
          aria-label="サイドバーのサイズ変更"
          tabIndex={0}
          style={{ cursor: "col-resize", touchAction: "none" }}
        />
      )}
    </div>
  );
};
