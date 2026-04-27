import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { ExplorerChromePinIcon } from "@/components/explorer/icons";
import type { MenuAction } from "@/components/folder/components/menus/menuActions";
import {
  getFolderId,
  getParentFolderId,
  type FolderTreeNode,
} from "@/components/folder/explorer/model/utils";
import { SidebarEntityRow } from "@/components/folder/explorer/rows/SidebarEntityRow";
import {
  EXPLORER_ROW_CONTENT_CLASS,
  EXPLORER_ROW_ICON_SLOT_CLASS,
  EXPLORER_ROW_TITLE_SLOT_CLASS,
  FOLDER_ROW_ICON_SIZE_CLASS,
  FOLDER_ROW_TITLE_CLASS,
} from "@/components/folder/explorer/rows/shared";
import { useExplorerDerivedData } from "@/components/folder/hooks/useExplorerDerivedData";
import { useExplorerStore } from "@/hooks/folder/useExplorerStore";
import { cn } from "@/lib/utils";
import type { Card, CardSet, DocumentItem, Folder } from "@/types";
import { ChevronDown, ChevronRight } from "@/ui/icons";
import { useEffect, useMemo } from "react";
import { flushSync } from "react-dom";

interface PinnedFolderSidebarSectionProps {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  selectedFolderId: string | null;
  isFiltering: boolean;
  folderListCountOverride?: number;
  onFolderSelect: (folderId: string | null) => void;
  onCreateRootFolder?: () => void;
}

type PinnedFolderEntry = {
  id: string;
  name: string;
  folder: FolderTreeNode;
  contentCount: number;
};

type SidebarSectionResizeTarget = {
  id: string;
  minHeight: number;
  maxHeight: number;
  resolveElement: () => HTMLElement | null;
  resolveHandleAnchor: () => HTMLElement | null;
};

const PINNED_FOLDER_SECTION_FRAME_ID =
  "pinned-folder-sidebar-section-frame";
const PINNED_FOLDER_SECTION_HEADER_ID =
  "pinned-folder-sidebar-section-header";
const PINNED_FOLDER_SECTION_CONTENT_ID =
  "pinned-folder-sidebar-section-content";
const FOLDER_LIST_SECTION_HEADER_ID = "folder-list-sidebar-section-header";
const FOLDER_LIST_SECTION_CONTENT_ID = "folder-list-sidebar-section-content";
const SIDEBAR_SECTION_RESIZE_STORAGE_PREFIX =
  "flashcard-master.explorer.sidebarSectionHeight";
const SIDEBAR_SECTION_RESIZE_HANDLE_ATTRIBUTE =
  "data-explorer-sidebar-section-resize-handle";

const SIDEBAR_SECTION_RESIZE_TARGETS: SidebarSectionResizeTarget[] = [
  {
    id: "pinned",
    minHeight: 44,
    maxHeight: 260,
    resolveElement: () =>
      document.getElementById(PINNED_FOLDER_SECTION_FRAME_ID) ??
      document.getElementById(PINNED_FOLDER_SECTION_CONTENT_ID),
    resolveHandleAnchor: () =>
      document.getElementById(PINNED_FOLDER_SECTION_FRAME_ID) ??
      document.getElementById(PINNED_FOLDER_SECTION_CONTENT_ID),
  },
  {
    id: "folder-list",
    minHeight: 96,
    maxHeight: 640,
    resolveElement: () =>
      document.getElementById(FOLDER_LIST_SECTION_CONTENT_ID),
    resolveHandleAnchor: () =>
      document.getElementById(FOLDER_LIST_SECTION_CONTENT_ID) ??
      document.getElementById(FOLDER_LIST_SECTION_HEADER_ID),
  },
  {
    id: "tag",
    minHeight: 42,
    maxHeight: 260,
    resolveElement: () =>
      document.querySelector<HTMLElement>(
        '[aria-controls="tag-sidebar-section-content"]',
      )?.parentElement ?? null,
    resolveHandleAnchor: () =>
      document.querySelector<HTMLElement>(
        '[aria-controls="tag-sidebar-section-content"]',
      )?.parentElement ?? null,
  },
  {
    id: "calendar",
    minHeight: 42,
    maxHeight: 260,
    resolveElement: () =>
      document.querySelector<HTMLElement>(
        '[aria-controls="calendar-sidebar-section-content"]',
      )?.parentElement ?? null,
    resolveHandleAnchor: () =>
      document.querySelector<HTMLElement>(
        '[aria-controls="calendar-sidebar-section-content"]',
      )?.parentElement ?? null,
  },
];

const isSoftDeletedFolder = (folder: FolderTreeNode) => {
  return Boolean(
    (folder as { isDeleted?: boolean; is_deleted?: boolean }).isDeleted ??
      (folder as { isDeleted?: boolean; is_deleted?: boolean }).is_deleted,
  );
};

const isHiddenFolder = (folder: FolderTreeNode) => {
  return Boolean(
    (folder as { isHidden?: boolean; is_hidden?: boolean }).isHidden ??
      (folder as { isHidden?: boolean; is_hidden?: boolean }).is_hidden,
  );
};

const getPinnedFolderName = (folder: FolderTreeNode) => {
  return (
    (folder as { folderName?: string; folder_name?: string }).folderName ??
    (folder as { folderName?: string; folder_name?: string }).folder_name ??
    "無題のフォルダ"
  );
};

const stopCreateButtonFocusTransfer = (
  event:
    | React.PointerEvent<HTMLButtonElement>
    | React.MouseEvent<HTMLButtonElement>,
) => {
  event.stopPropagation();
};

const getSidebarSectionResizeStorageKey = (sectionId: string) => {
  return `${SIDEBAR_SECTION_RESIZE_STORAGE_PREFIX}.${sectionId}`;
};

const clampSectionHeight = (
  value: number,
  minHeight: number,
  maxHeight: number,
) => {
  return Math.min(maxHeight, Math.max(minHeight, value));
};

const readStoredSectionHeight = (target: SidebarSectionResizeTarget) => {
  const rawValue = window.localStorage.getItem(
    getSidebarSectionResizeStorageKey(target.id),
  );
  const parsedValue = rawValue === null ? Number.NaN : Number(rawValue);

  return Number.isFinite(parsedValue)
    ? clampSectionHeight(parsedValue, target.minHeight, target.maxHeight)
    : null;
};

const writeStoredSectionHeight = (
  target: SidebarSectionResizeTarget,
  height: number,
) => {
  window.localStorage.setItem(
    getSidebarSectionResizeStorageKey(target.id),
    String(Math.round(height)),
  );
};

const applySidebarSectionHeight = (
  element: HTMLElement,
  height: number,
) => {
  const roundedHeight = Math.round(height);

  element.style.height = `${roundedHeight}px`;
  element.style.minHeight = `${roundedHeight}px`;
  element.style.maxHeight = `${roundedHeight}px`;
  element.style.flex = `0 0 ${roundedHeight}px`;
  element.style.overflow = "hidden";
};

const createSidebarSectionResizeHandle = (
  target: SidebarSectionResizeTarget,
  element: HTMLElement,
) => {
  const handle = document.createElement("div");
  const indicator = document.createElement("div");

  handle.setAttribute(SIDEBAR_SECTION_RESIZE_HANDLE_ATTRIBUTE, target.id);
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("aria-label", "サイドバー区切り位置を調整");
  handle.setAttribute("tabindex", "0");
  handle.title = "ドラッグで区切り位置を変更。ダブルクリックで初期値に戻します。";

  Object.assign(handle.style, {
    position: "relative",
    zIndex: "80",
    height: "8px",
    margin: "-4px 8px",
    cursor: "row-resize",
    touchAction: "none",
    userSelect: "none",
    background: "transparent",
  } satisfies Partial<CSSStyleDeclaration>);

  Object.assign(indicator.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: "3px",
    height: "1px",
    borderRadius: "999px",
    background: "rgba(120, 113, 108, 0.28)",
    boxShadow: "none",
    transition: "background-color 120ms ease, height 120ms ease, top 120ms ease",
  } satisfies Partial<CSSStyleDeclaration>);

  handle.appendChild(indicator);

  const showIndicator = () => {
    indicator.style.top = "2px";
    indicator.style.height = "2px";
    indicator.style.background = "rgba(120, 113, 108, 0.62)";
  };

  const hideIndicator = () => {
    indicator.style.top = "3px";
    indicator.style.height = "1px";
    indicator.style.background = "rgba(120, 113, 108, 0.28)";
  };

  const commitHeight = (height: number) => {
    const clampedHeight = clampSectionHeight(
      height,
      target.minHeight,
      target.maxHeight,
    );

    applySidebarSectionHeight(element, clampedHeight);
    writeStoredSectionHeight(target, clampedHeight);
  };

  const resizeByKeyboard = (event: KeyboardEvent) => {
    const currentHeight = element.getBoundingClientRect().height;
    const step = event.shiftKey ? 16 : 6;
    const nextHeight = (() => {
      switch (event.key) {
        case "ArrowUp":
          return currentHeight - step;
        case "ArrowDown":
          return currentHeight + step;
        case "PageUp":
          return currentHeight - step * 4;
        case "PageDown":
          return currentHeight + step * 4;
        case "Home":
          return target.minHeight;
        case "End":
          return target.maxHeight;
        default:
          return null;
      }
    })();

    if (nextHeight === null) {
      return;
    }

    event.preventDefault();
    commitHeight(nextHeight);
  };

  const startResize = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    showIndicator();

    const startY = event.clientY;
    const startHeight = element.getBoundingClientRect().height;
    let pendingHeight = startHeight;
    let frameId: number | null = null;
    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;

    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const paint = () => {
      frameId = null;
      applySidebarSectionHeight(element, pendingHeight);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      pendingHeight = clampSectionHeight(
        startHeight + moveEvent.clientY - startY,
        target.minHeight,
        target.maxHeight,
      );

      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(paint);
    };

    const handlePointerUp = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      commitHeight(pendingHeight);
      hideIndicator();
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const resetHeight = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    window.localStorage.removeItem(getSidebarSectionResizeStorageKey(target.id));
    element.style.height = "";
    element.style.minHeight = "";
    element.style.maxHeight = "";
    element.style.flex = "";
    element.style.overflow = "";
  };

  handle.addEventListener("mouseenter", showIndicator);
  handle.addEventListener("mouseleave", hideIndicator);
  handle.addEventListener("focus", showIndicator);
  handle.addEventListener("blur", hideIndicator);
  handle.addEventListener("pointerdown", startResize);
  handle.addEventListener("keydown", resizeByKeyboard);
  handle.addEventListener("dblclick", resetHeight);

  return {
    handle,
    cleanup: () => {
      if (handle.parentElement) {
        handle.parentElement.removeChild(handle);
      }
    },
  };
};

const SidebarSectionResizeBridge = () => {
  useEffect(() => {
    const cleanupCallbacks: Array<() => void> = [];

    const mountHandles = () => {
      for (const target of SIDEBAR_SECTION_RESIZE_TARGETS) {
        const element = target.resolveElement();
        const anchor = target.resolveHandleAnchor();

        if (!element || !anchor) {
          continue;
        }

        if (
          document.querySelector(
            `[${SIDEBAR_SECTION_RESIZE_HANDLE_ATTRIBUTE}="${target.id}"]`,
          )
        ) {
          continue;
        }

        const originalOverflow = element.style.overflow;
        const originalHeight = element.style.height;
        const originalMinHeight = element.style.minHeight;
        const originalMaxHeight = element.style.maxHeight;
        const originalFlex = element.style.flex;
        const storedHeight = readStoredSectionHeight(target);

        if (storedHeight !== null) {
          applySidebarSectionHeight(element, storedHeight);
        }

        const { handle, cleanup } = createSidebarSectionResizeHandle(
          target,
          element,
        );
        anchor.insertAdjacentElement("afterend", handle);

        cleanupCallbacks.push(() => {
          cleanup();
          element.style.overflow = originalOverflow;
          element.style.height = originalHeight;
          element.style.minHeight = originalMinHeight;
          element.style.maxHeight = originalMaxHeight;
          element.style.flex = originalFlex;
        });
      }
    };

    mountHandles();
    const frameId = window.requestAnimationFrame(mountHandles);
    const timeoutId = window.setTimeout(mountHandles, 120);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      cleanupCallbacks.forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
};

export const PinnedFolderSidebarSection = ({
  folders,
  cards,
  cardSets,
  documents,
  selectedFolderId,
  isFiltering,
  folderListCountOverride,
  onFolderSelect,
  onCreateRootFolder,
}: PinnedFolderSidebarSectionProps) => {
  const pinnedFolderIds = useExplorerStore((state) => state.pinnedFolderIds);
  const unpinFolder = useExplorerStore((state) => state.unpinFolder);
  const isPinnedFolderSectionCollapsed = useExplorerStore(
    (state) => state.isPinnedFolderSectionCollapsed,
  );
  const togglePinnedFolderSectionCollapsed = useExplorerStore(
    (state) => state.togglePinnedFolderSectionCollapsed,
  );
  const isFolderListSectionCollapsed = useExplorerStore(
    (state) => state.isFolderListSectionCollapsed,
  );
  const toggleFolderListSectionCollapsed = useExplorerStore(
    (state) => state.toggleFolderListSectionCollapsed,
  );
  const treeFolders = folders as unknown as FolderTreeNode[];

  const { getFolderContentCount, matchCountMap } = useExplorerDerivedData({
    treeFolders,
    treeCards: cards,
    cardSets,
    documents,
    isFiltering,
  });

  const folderById = useMemo(() => {
    const map = new Map<string, FolderTreeNode>();

    for (const folder of treeFolders) {
      const id = getFolderId(folder);
      if (!id) continue;
      if (isSoftDeletedFolder(folder) || isHiddenFolder(folder)) continue;
      map.set(id, folder);
    }

    return map;
  }, [treeFolders]);

  const pinnedFolders = useMemo<PinnedFolderEntry[]>(() => {
    return pinnedFolderIds
      .map((folderId) => {
        const folder = folderById.get(folderId);
        if (!folder) return null;

        if (isFiltering && (matchCountMap.get(folderId) ?? 0) <= 0) {
          return null;
        }

        return {
          id: folderId,
          name: getPinnedFolderName(folder),
          folder,
          contentCount: getFolderContentCount(folderId),
        };
      })
      .filter((entry): entry is PinnedFolderEntry => entry !== null);
  }, [
    folderById,
    getFolderContentCount,
    isFiltering,
    matchCountMap,
    pinnedFolderIds,
  ]);

  const computedFolderListCount = useMemo(() => {
    let count = 0;
    for (const folder of folderById.values()) {
      const folderId = getFolderId(folder);
      if (!folderId) continue;
      if (getParentFolderId(folder) !== null) continue;
      if (isFiltering && (matchCountMap.get(folderId) ?? 0) <= 0) continue;
      count += 1;
    }
    return count;
  }, [folderById, isFiltering, matchCountMap]);

  const folderListCount = folderListCountOverride ?? computedFolderListCount;

  const handleCreateRootFolder = () => {
    flushSync(() => {
      if (isFolderListSectionCollapsed) {
        toggleFolderListSectionCollapsed();
      }
    });

    onCreateRootFolder?.();
  };

  return (
    <section className="shrink-0 pb-0 pt-1">
      <SidebarSectionResizeBridge />
      <>
        <div id={PINNED_FOLDER_SECTION_FRAME_ID} className="relative">
          <div id={PINNED_FOLDER_SECTION_HEADER_ID} className="px-2 pb-1 pt-1">
            <button
            type="button"
            className={cn(
              "group flex h-7 w-full items-center gap-1 rounded-md px-1 text-left",
              "text-[11px] font-medium leading-5 text-muted-foreground transition",
              "hover:bg-muted/70 hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
            aria-expanded={!isPinnedFolderSectionCollapsed}
            aria-controls={PINNED_FOLDER_SECTION_CONTENT_ID}
            onClick={togglePinnedFolderSectionCollapsed}
          >
            {isPinnedFolderSectionCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
            )}

            <span className="min-w-0 flex-1 truncate">ピン留め</span>

            <span className="tabular-nums opacity-60">
              {pinnedFolders.length}
            </span>
            </button>
          </div>

          <div
            id={PINNED_FOLDER_SECTION_CONTENT_ID}
          className={cn(
            "space-y-0.5",
            isPinnedFolderSectionCollapsed && "hidden",
          )}
        >
            {pinnedFolders.map((entry) => {
            const isSelected = selectedFolderId === entry.id;
            const menuActions: MenuAction[] = [
              {
                id: "unpin-folder",
                label: "ピン留めを外す",
                icon: <ExplorerChromePinIcon className="h-4 w-4" />,
                onSelect: () => unpinFolder(entry.id),
              },
            ];

            return (
              <SidebarEntityRow
                key={entry.id}
                selected={isSelected}
                menuActions={menuActions}
                hasContextMenu
                contextMenuVariant="folderContext"
                contentClassName={EXPLORER_ROW_CONTENT_CLASS}
                iconClassName={EXPLORER_ROW_ICON_SLOT_CLASS}
                titleSlotClassName={EXPLORER_ROW_TITLE_SLOT_CLASS}
                title={entry.name}
                titleClassName={cn(
                  FOLDER_ROW_TITLE_CLASS,
                  isSelected ? "font-medium" : "font-normal",
                )}
                trailing={
                  <div className="ml-auto flex shrink-0 items-center gap-1 pr-1">
                    <span className="ds-list-item__subtitle text-[11px] font-normal tabular-nums leading-none opacity-60">
                      {entry.contentCount}
                    </span>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground",
                        "opacity-70 transition hover:bg-muted hover:text-foreground group-hover:opacity-100",
                      )}
                      aria-label="ピン留めを外す"
                      title="ピン留めを外す"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        unpinFolder(entry.id);
                      }}
                      onPointerDown={(event) => {
                        event.stopPropagation();
                      }}
                    >
                      <ExplorerChromePinIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                }
                icon={
                  <ExplorerChromeFolderIcon
                    className={cn(FOLDER_ROW_ICON_SIZE_CLASS)}
                  />
                }
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  if (event.defaultPrevented) return;
                  onFolderSelect(entry.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onFolderSelect(entry.id);
                  }
                }}
              />
            );
          })}
          </div>
        </div>

        <div id={FOLDER_LIST_SECTION_HEADER_ID} className="mt-1 border-t border-border/60 px-2 pb-1 pt-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                "group flex h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-1 text-left",
                "text-[11px] font-medium leading-5 text-muted-foreground transition",
                "hover:bg-muted/70 hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
              aria-expanded={!isFolderListSectionCollapsed}
              aria-controls={FOLDER_LIST_SECTION_CONTENT_ID}
              onClick={toggleFolderListSectionCollapsed}
            >
              {isFolderListSectionCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              )}

              <span className="min-w-0 flex-1 truncate">フォルダ一覧</span>

              <span className="tabular-nums opacity-60">{folderListCount}</span>
            </button>

            {onCreateRootFolder ? (
              <button
                type="button"
                className={cn(
                  "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                  "text-[17px] leading-none text-muted-foreground transition",
                  "hover:bg-muted/70 hover:text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
                aria-label="ルートフォルダを作成"
                title="ルートフォルダを作成"
                data-sidebar-create-root-folder-button="true"
                onPointerDown={stopCreateButtonFocusTransfer}
                onMouseDown={stopCreateButtonFocusTransfer}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleCreateRootFolder();
                }}
              >
                +
              </button>
            ) : null}
          </div>
        </div>
      </>
    </section>
  );
};
