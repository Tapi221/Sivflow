import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { useFolderTagModeStore } from "@/hooks/folder/useFolderTagModeStore";
import { LibraryHierarchySidebar } from "@/pane.desktop/leftpane/folder/LayeredDirectorySidebar";

type FocusedProjectState = {
  index: number;
  label: string;
};

const PROJECT_SECTION_LABEL = "MY PROJECTS";
const TAG_SECTION_LABEL = "MY TAG TREE";
const LIBRARY_TREE_SELECTOR = '[role="tree"][aria-label="ライブラリ"]';
const ROOT_PROJECT_TREE_ITEM_SELECTOR = '[role="treeitem"][aria-level="1"]';

const getLibraryTreeElement = (container: HTMLDivElement | null): HTMLElement | null => container?.querySelector<HTMLElement>(LIBRARY_TREE_SELECTOR) ?? null;

const getRootProjectElements = (container: HTMLDivElement | null): HTMLElement[] => {
  const libraryTreeElement = getLibraryTreeElement(container);
  if (!libraryTreeElement) return [];

  return Array.from(libraryTreeElement.children).filter((element): element is HTMLElement => element instanceof HTMLElement);
};

const getRootProjectTreeItem = (target: EventTarget | null): HTMLElement | null => {
  if (!(target instanceof HTMLElement)) return null;

  const treeItem = target.closest<HTMLElement>(ROOT_PROJECT_TREE_ITEM_SELECTOR);
  if (!treeItem) return null;

  return treeItem.closest(LIBRARY_TREE_SELECTOR) ? treeItem : null;
};

const getTreeItemLabel = (treeItem: HTMLElement): string => treeItem.textContent?.trim() ?? "";

const openRootProjectIfNeeded = (treeItem: HTMLElement) => {
  if (treeItem.getAttribute("aria-expanded") !== "false") return;

  treeItem.querySelector<HTMLButtonElement>('button[type="button"]')?.click();
};

const applyFocusedProjectVisibility = (container: HTMLDivElement | null, focusedProjectIndex: number | null) => {
  const rootProjectElements = getRootProjectElements(container);
  const shouldShowAll = focusedProjectIndex === null || focusedProjectIndex < 0 || focusedProjectIndex >= rootProjectElements.length;

  rootProjectElements.forEach((element, index) => {
    if (shouldShowAll || index === focusedProjectIndex) {
      element.removeAttribute("hidden");
      return;
    }

    element.setAttribute("hidden", "");
  });
};

const SidebarLayeredDirectory = () => {
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const [focusedProject, setFocusedProject] = useState<FocusedProjectState | null>(null);
  const sectionLabel = folderTagMode === "tag" ? TAG_SECTION_LABEL : PROJECT_SECTION_LABEL;

  const clearFocusedProject = useCallback(() => {
    setFocusedProject(null);
  }, []);

  const handleProjectClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (folderTagMode === "tag") return;

    const treeItem = getRootProjectTreeItem(event.target);
    if (!treeItem) return;

    const rootProjectElements = getRootProjectElements(sidebarRef.current);
    const focusedProjectIndex = rootProjectElements.findIndex((element) => element.contains(treeItem));
    if (focusedProjectIndex === -1) return;

    setFocusedProject({ index: focusedProjectIndex, label: getTreeItemLabel(treeItem) });
    window.setTimeout(() => openRootProjectIfNeeded(treeItem), 0);
  }, [folderTagMode]);

  useEffect(() => {
    const container = sidebarRef.current;
    const focusedProjectIndex = folderTagMode === "tag" ? null : focusedProject?.index ?? null;

    applyFocusedProjectVisibility(container, focusedProjectIndex);

    if (focusedProjectIndex === null || typeof MutationObserver === "undefined") return;

    const libraryTreeElement = getLibraryTreeElement(container);
    if (!libraryTreeElement) return;

    const observer = new MutationObserver(() => applyFocusedProjectVisibility(container, focusedProjectIndex));
    observer.observe(libraryTreeElement, { childList: true });

    return () => observer.disconnect();
  }, [focusedProject, folderTagMode]);

  return (
    <div ref={sidebarRef} onClickCapture={handleProjectClickCapture} className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent font-sans text-[#5f6672] antialiased">
      <div className="shrink-0 pb-1 pl-3 pr-2 pt-2 text-[11px] font-bold uppercase leading-none tracking-[0.04em] text-[#9a9a9a]">
        {focusedProject && folderTagMode !== "tag" ? (
          <button type="button" onClick={clearFocusedProject} aria-label={`${focusedProject.label} の絞り込みを解除`} className="-ml-1 rounded-md px-1 text-left uppercase tracking-[0.04em] transition hover:bg-[#f7f7f8] hover:text-[#7f858d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9d9de]">
            ← {PROJECT_SECTION_LABEL}
          </button>
        ) : (
          sectionLabel
        )}
      </div>
      <div className="min-h-0 flex-1">
        <LibraryHierarchySidebar />
      </div>
    </div>
  );
};

export { LibraryHierarchySidebar, SidebarLayeredDirectory };
