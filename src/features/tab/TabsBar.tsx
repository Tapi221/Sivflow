import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { PlusLineIcon } from "@/components/icons/icons.schedule";
import { ClockIcon, HomeIcon, InboxIcon, LibraryIcon, SettingIcon } from "@/components/icons/icons.sidebar";
import { WorkspaceTabDndItem, WorkspaceTabDndList } from "@/features/dnd/tab/WorkspaceTabDnd";
import { useWorkspaceTabDnd } from "@/features/dnd/tab/useWorkspaceTabDnd";
import type { WorkspaceSidebarSection, WorkspaceTab } from "@/features/tab/Tab";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import { resolveWorkspaceTabRoute } from "@/features/tab/resolveTabRoute";
import { WORKSPACE_TAB_CONTEXT_MENU_HEIGHT, WORKSPACE_TAB_CONTEXT_MENU_MARGIN, WORKSPACE_TAB_CONTEXT_MENU_WIDTH, WorkspaceTabContextMenu } from "@/chip/rightclickpanel/TabContextMenu";
import { cn } from "@/lib/utils";
import { FileText, Layers, X } from "@/ui/icons";

type TabsBarVariant = "workspace" | "titlebar";

type TabsBarProps = {
  variant?: TabsBarVariant;
  className?: string;
  noDragStyle?: CSSProperties;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

type TabIconComponent = ComponentType<{ className?: string }>;

type TabContextMenuState = {
  tabId: WorkspaceTab["id"];
  x: number;
  y: number;
};

type TabContextMenuTriggerEvent =
  | ReactMouseEvent<HTMLElement>
  | ReactPointerEvent<HTMLElement>;

const TABS_NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};

const TABS_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "drag",
};

const ACTIVE_TAB_SURFACE_STYLE: CSSProperties = {
  background: "var(--app-active-tab-bg, #ffffff)",
};

const ACTIVE_TAB_JOIN_STYLE: CSSProperties = {};

const ACTIVE_TAB_LEFT_CURVE_STYLE: CSSProperties = {
  ...ACTIVE_TAB_SURFACE_STYLE,
  WebkitMask:
    "radial-gradient(circle at 0 0, transparent 0 16px, #000 16.5px)",
  mask: "radial-gradient(circle at 0 0, transparent 0 16px, #000 16.5px)",
};

const ACTIVE_TAB_RIGHT_CURVE_STYLE: CSSProperties = {
  ...ACTIVE_TAB_SURFACE_STYLE,
  WebkitMask:
    "radial-gradient(circle at 100% 0, transparent 0 16px, #000 16.5px)",
  mask: "radial-gradient(circle at 100% 0, transparent 0 16px, #000 16.5px)",
};

const TAB_OPEN_ANIMATION_MS = 280;

const TAB_OPEN_ANIMATION_STYLE = `
@keyframes workspace-tab-open {
  from {
    opacity: 0;
    transform: translateY(7px) scaleX(0.96);
  }

  to {
    opacity: 1;
    transform: translateY(0) scaleX(1);
  }
}

.explorer-workspace-tab--opening {
  animation: workspace-tab-open 240ms cubic-bezier(.22, 1, .36, 1);
  transform-origin: bottom center;
  will-change: opacity, transform;
}

@media (prefers-reduced-motion: reduce) {
  .explorer-workspace-tab--opening {
    animation: none;
  }
}
`;

const resolveTabsSurfaceStyle = (isTitlebar: boolean): CSSProperties => ({
  background: isTitlebar
    ? "var(--app-titlebar-bg, var(--app-sidebar-bg))"
    : "var(--app-sidebar-bg)",
});

const resolveInactiveTabTextClassName = (isTitlebar: boolean): string =>
  isTitlebar
    ? "text-[var(--app-titlebar-text)] hover:text-[var(--app-titlebar-text-strong)]"
    : "text-[var(--app-sidebar-text)] hover:text-[var(--app-sidebar-text-strong)]";

const resolveInactiveTabIconClassName = (isTitlebar: boolean): string =>
  isTitlebar
    ? "text-[var(--app-titlebar-icon)]"
    : "text-[var(--app-sidebar-icon)]";

const resolveCloseButtonClassName = (isTitlebar: boolean): string => {
  if (isTitlebar) {
    return cn(
      "explorer-workspace-tab-close mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded outline-none transition-colors",
      "text-[var(--app-titlebar-icon)] hover:bg-white/10 hover:text-[var(--app-titlebar-text-strong)]",
    );
  }

  return cn(
    "explorer-workspace-tab-close mr-2 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded outline-none transition-colors",
    "text-[var(--app-sidebar-icon)] hover:bg-black/5 hover:text-[var(--app-sidebar-text-strong)]",
  );
};

const resolveAddButtonClassName = (isTitlebar: boolean): string => {
  if (isTitlebar) {
    return cn(
      "explorer-workspace-tab-add mb-[1px] ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border-0 outline-none transition-colors",
      "bg-transparent text-[var(--app-titlebar-icon)] hover:bg-white/10 hover:text-[var(--app-titlebar-text-strong)]",
    );
  }

  return cn(
    "explorer-workspace-tab-add mb-[1px] ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border-0 outline-none transition-colors",
    "text-[var(--app-sidebar-text)] hover:bg-black/5 hover:text-[var(--app-sidebar-text-strong)]",
  );
};

const resolveNextTabOnClose = (
  tabs: WorkspaceTab[],
  closingTabId: WorkspaceTab["id"],
): WorkspaceTab | null => {
  const closingIndex = tabs.findIndex((tab) => tab.id === closingTabId);
  const nextTabs = tabs.filter((tab) => tab.id !== closingTabId);

  if (nextTabs.length === 0) {
    return null;
  }

  const fallbackIndex = Math.max(
    0,
    Math.min(closingIndex, nextTabs.length - 1),
  );

  return nextTabs[fallbackIndex] ?? null;
};

const resolveTabSlotLayoutStyle = (
  tab: WorkspaceTab,
  interactiveStyle: AppRegionStyle,
): AppRegionStyle => {
  const style: AppRegionStyle = { ...interactiveStyle };

  if (tab.kind === "route") {
    style.flexBasis = 152;
    style.minWidth = 136;
  }

  return style;
};

const clampContextMenuPosition = (
  clientX: number,
  clientY: number,
): { x: number; y: number } => {
  const maxX = Math.max(
    WORKSPACE_TAB_CONTEXT_MENU_MARGIN,
    window.innerWidth -
      WORKSPACE_TAB_CONTEXT_MENU_WIDTH -
      WORKSPACE_TAB_CONTEXT_MENU_MARGIN,
  );
  const maxY = Math.max(
    WORKSPACE_TAB_CONTEXT_MENU_MARGIN,
    window.innerHeight -
      WORKSPACE_TAB_CONTEXT_MENU_HEIGHT -
      WORKSPACE_TAB_CONTEXT_MENU_MARGIN,
  );

  return {
    x: Math.min(Math.max(clientX, WORKSPACE_TAB_CONTEXT_MENU_MARGIN), maxX),
    y: Math.min(Math.max(clientY, WORKSPACE_TAB_CONTEXT_MENU_MARGIN), maxY),
  };
};

const SIDEBAR_ROUTE_TAB_ICONS = {
  home: HomeIcon,
  review: InboxIcon,
  schedule: ClockIcon,
  settings: SettingIcon,
} satisfies Partial<Record<WorkspaceSidebarSection, TabIconComponent>>;

const resolveTabIcon = (tab: WorkspaceTab): TabIconComponent => {
  if (tab.kind === "route") {
    return SIDEBAR_ROUTE_TAB_ICONS[tab.sectionKey] ?? FileText;
  }

  if (tab.kind === "explorer") return LibraryIcon;
  if (tab.kind === "card") return Layers;

  return FileText;
};

export const TabsBar = ({
  variant = "workspace",
  className,
  noDragStyle,
}: TabsBarProps) => {
  const navigate = useNavigate();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const lastOpenedTabId = useWorkspaceTabsStore(
    (state) => state.lastOpenedTabId,
  );
  const selectTab = useWorkspaceTabsStore((state) => state.selectTab);
  const closeTab = useWorkspaceTabsStore((state) => state.closeTab);
  const reorderTabs = useWorkspaceTabsStore((state) => state.reorderTabs);
  const createExplorerTab = useWorkspaceTabsStore(
    (state) => state.createExplorerTab,
  );

  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const [openingTabId, setOpeningTabId] = useState<WorkspaceTab["id"] | null>(
    lastOpenedTabId,
  );
  const [contextMenu, setContextMenu] =
    useState<TabContextMenuState | null>(null);
  const isTitlebar = variant === "titlebar";
  const interactiveStyle = noDragStyle ?? TABS_NO_DRAG_STYLE;
  const tabsSurfaceStyle = resolveTabsSurfaceStyle(isTitlebar);
  const closeButtonClassName = resolveCloseButtonClassName(isTitlebar);
  const addButtonClassName = resolveAddButtonClassName(isTitlebar);
  const {
    canReorderTabs,
    handleReorderTabs,
    handleTabDragEnd,
    handleTabDragStart,
    isTabClickSuppressed,
    orderedTabs,
    suppressNextTabClick,
    tabsListRef,
  } = useWorkspaceTabDnd({
    tabs,
    reorderTabs,
    onDragStart: () => setContextMenu(null),
  });
  const contextMenuTab = contextMenu
    ? orderedTabs.find((tab) => tab.id === contextMenu.tabId)
    : undefined;

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      setOpeningTabId(lastOpenedTabId ?? null);
    });

    if (!lastOpenedTabId) {
      return () => {
        cancelled = true;
      };
    }

    const timeoutId = window.setTimeout(() => {
      setOpeningTabId((currentTabId) =>
        currentTabId === lastOpenedTabId ? null : currentTabId,
      );
    }, TAB_OPEN_ANIMATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [lastOpenedTabId]);

  useEffect(() => {
    if (!contextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (contextMenuRef.current?.contains(event.target as Node)) return;
      setContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };
    const closeMenu = () => setContextMenu(null);

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeMenu, { once: true });
    window.addEventListener("scroll", closeMenu, {
      capture: true,
      once: true,
    });

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, { capture: true });
    };
  }, [contextMenu]);

  const navigateToCurrentActiveTab = () => {
    const currentTabs = useWorkspaceTabsStore.getState().tabs;
    const currentActiveTabId = useWorkspaceTabsStore.getState().activeTabId;
    const currentActiveTab = currentTabs.find(
      (tab) => tab.id === currentActiveTabId,
    );

    if (currentActiveTab) {
      navigate(resolveWorkspaceTabRoute(currentActiveTab));
    }
  };

  const closeWorkspaceTabs = (tabsToClose: WorkspaceTab[]) => {
    tabsToClose.forEach((tab) => closeTab(tab.id));
    navigateToCurrentActiveTab();
  };

  const openTabContextMenu = (
    event: TabContextMenuTriggerEvent,
    tab: WorkspaceTab,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    suppressNextTabClick();

    const { x, y } = clampContextMenuPosition(event.clientX, event.clientY);
    setContextMenu({ tabId: tab.id, x, y });
  };

  const contextMenuActions = contextMenuTab
    ? [
      {
        id: "close-current",
        label: "閉じる",
        disabled: !contextMenuTab.isClosable,
        onSelect: () => {
          setContextMenu(null);

          const nextTab =
            contextMenuTab.id === activeTabId
              ? resolveNextTabOnClose(orderedTabs, contextMenuTab.id)
              : null;

          closeTab(contextMenuTab.id);

          if (nextTab) {
            navigate(resolveWorkspaceTabRoute(nextTab));
          }
        },
      },
      {
        id: "close-others",
        label: "他を閉じる",
        disabled:
          orderedTabs.filter(
            (tab) => tab.id !== contextMenuTab.id && tab.isClosable,
          ).length === 0,
        onSelect: () => {
          setContextMenu(null);
          selectTab(contextMenuTab.id);
          closeWorkspaceTabs(
            orderedTabs.filter(
              (tab) => tab.id !== contextMenuTab.id && tab.isClosable,
            ),
          );
          navigate(resolveWorkspaceTabRoute(contextMenuTab));
        },
      },
      {
        id: "close-after",
        label: "このタブ以降を閉じる",
        disabled:
          orderedTabs
            .slice(
              orderedTabs.findIndex((tab) => tab.id === contextMenuTab.id),
            )
            .filter((tab) => tab.isClosable).length === 0,
        onSelect: () => {
          setContextMenu(null);
          const contextMenuTabIndex = orderedTabs.findIndex(
            (tab) => tab.id === contextMenuTab.id,
          );
          const tabsToClose = orderedTabs
            .slice(Math.max(0, contextMenuTabIndex))
            .filter((tab) => tab.isClosable);
          closeWorkspaceTabs(tabsToClose);
        },
      },
      {
        id: "close-all",
        label: "すべてを閉じる",
        disabled: orderedTabs.every((tab) => !tab.isClosable),
        onSelect: () => {
          setContextMenu(null);
          closeWorkspaceTabs(orderedTabs.filter((tab) => tab.isClosable));
        },
      },
    ]
    : [];

  const contextMenuElement = contextMenu ? (
    <WorkspaceTabContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      actions={contextMenuActions}
      menuRef={contextMenuRef}
      noDragStyle={interactiveStyle}
    />
  ) : null;

  return (
    <>
      <style>{TAB_OPEN_ANIMATION_STYLE}</style>

      <div
        style={{
          ...tabsSurfaceStyle,
          ...TABS_DRAG_STYLE,
        }}
        className={cn(
          "explorer-chrome-font explorer-tab-bar explorer-workspace-tabs-bar relative z-30 flex shrink-0 items-end gap-0 overflow-visible border-b-0",
          isTitlebar
            ? "h-full min-w-0 flex-1 px-0 pt-0"
            : "h-[40px] w-full min-w-0 px-1.5 pt-0",
          className,
        )}
      >
        <WorkspaceTabDndList
          tabsListRef={tabsListRef}
          orderedTabs={orderedTabs}
          onReorderTabs={handleReorderTabs}
          className="explorer-tab-list explorer-workspace-tabs-list relative flex min-w-0 items-end gap-0 overflow-visible"
        >
          {orderedTabs.map((tab) => {
            const selected = tab.id === activeTabId;
            const isOpening = tab.id === openingTabId;
            const Icon = resolveTabIcon(tab);
            const inactiveTextClassName =
              resolveInactiveTabTextClassName(isTitlebar);
            const inactiveIconClassName =
              resolveInactiveTabIconClassName(isTitlebar);

            let tabStateClassName = cn(
              "explorer-workspace-tab--inactive",
              inactiveTextClassName,
            );
            let iconStateClassName = inactiveIconClassName;
            let closeButtonStateClassName = "opacity-80 hover:opacity-100";

            if (selected) {
              tabStateClassName =
                "z-[3] text-[var(--app-titlebar-bg,var(--app-sidebar-bg))] shadow-none";
              iconStateClassName = "text-[#8c8c8c]";
              closeButtonStateClassName =
                "opacity-100 !text-[#6f7681] hover:!bg-black/5 hover:!text-[#2f3640]";
            }

            return (
              <WorkspaceTabDndItem
                key={tab.id}
                tab={tab}
                canReorderTabs={canReorderTabs}
                tabsListRef={tabsListRef}
                onDragStart={handleTabDragStart}
                onDragEnd={handleTabDragEnd}
                style={resolveTabSlotLayoutStyle(tab, interactiveStyle)}
                className={cn(
                  "explorer-workspace-tab-slot relative flex min-w-[92px] max-w-[180px] flex-[1_1_150px] items-end overflow-visible",
                  canReorderTabs
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-default",
                )}
                data-workspace-tab-slot-active={selected ? "true" : undefined}
                onPointerDownCapture={(event) => {
                  if (event.button !== 2) return;
                  openTabContextMenu(event, tab);
                }}
                onContextMenu={(event) => openTabContextMenu(event, tab)}
              >
                <div
                  style={{
                    ...tabsSurfaceStyle,
                    ...interactiveStyle,
                    background: "transparent",
                  }}
                  data-workspace-tab-kind={tab.kind}
                  data-workspace-tab-active={selected ? "true" : undefined}
                  className={cn(
                    "explorer-workspace-tab group/tab relative flex min-w-0 items-center overflow-visible border-0 text-[13px]",
                    "mb-0 h-[36px] rounded-tl-[8px] rounded-tr-[8px]",
                    "transition-[color,transform] duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                    tabStateClassName,
                    isOpening && "explorer-workspace-tab--opening",
                  )}
                >
                  {selected ? (
                    <div
                      aria-hidden="true"
                      style={{
                        ...ACTIVE_TAB_SURFACE_STYLE,
                        ...ACTIVE_TAB_JOIN_STYLE,
                      }}
                      className={cn(
                        "pointer-events-none absolute bottom-[-1px] left-0 right-0 z-0 h-[33px] rounded-t-[10px]",
                        "transition-opacity duration-[220ms] ease-[cubic-bezier(.22,1,.36,1)]",
                        "motion-reduce:transition-none",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-1px] left-[-16px] h-[18px] w-[18px]"
                        style={ACTIVE_TAB_LEFT_CURVE_STYLE}
                      />

                      <span
                        aria-hidden="true"
                        className="absolute bottom-[-1px] right-[-16px] h-[18px] w-[18px]"
                        style={ACTIVE_TAB_RIGHT_CURVE_STYLE}
                      />
                    </div>
                  ) : null}

                  <button
                    type="button"
                    style={interactiveStyle}
                    className="explorer-workspace-tab-button relative z-[2] flex h-full w-full min-w-0 flex-1 items-center gap-2 px-3 text-left outline-none"
                    aria-current={selected ? "page" : undefined}
                    title={tab.title}
                    onClick={(event) => {
                      if (isTabClickSuppressed()) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }

                      setContextMenu(null);
                      selectTab(tab.id);
                      navigate(resolveWorkspaceTabRoute(tab));
                    }}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-transform duration-300 ease-[cubic-bezier(.22,1,.36,1)]",
                        iconStateClassName,
                      )}
                    />

                    <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                  </button>

                  {tab.isClosable ? (
                    <button
                      type="button"
                      style={interactiveStyle}
                      className={cn(
                        "relative z-[2]",
                        closeButtonClassName,
                        closeButtonStateClassName,
                      )}
                      aria-label={`${tab.title} を閉じる`}
                      title="閉じる"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setContextMenu(null);

                        const nextTab = selected
                          ? resolveNextTabOnClose(orderedTabs, tab.id)
                          : null;

                        closeTab(tab.id);

                        if (nextTab) {
                          navigate(resolveWorkspaceTabRoute(nextTab));
                        }
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  ) : null}
                </div>
              </WorkspaceTabDndItem>
            );
          })}
        </WorkspaceTabDndList>

        <button
          type="button"
          style={interactiveStyle}
          className={addButtonClassName}
          aria-label="新しいエクスプローラータブを開く"
          title="新しいエクスプローラータブ"
          onClick={() => {
            setContextMenu(null);
            createExplorerTab();
            navigate("/library?view=section-list&libraryType=pdf");
          }}
        >
          <PlusLineIcon className="h-4 w-4" />
        </button>

        <div className="h-full min-w-0 flex-1" />
      </div>

      {contextMenuElement ? createPortal(contextMenuElement, document.body) : null}
    </>
  );
};
