import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type CSSProperties,
} from "react";
import { Reorder } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import { resolveWorkspaceTabRoute } from "@/features/tab/resolveTabRoute";
import type { WorkspaceTab } from "@/features/tab/Tab";
import { Calendar, FileText, FolderIcon, Layers, X } from "@/ui/icons";
import { PlusLineIcon } from "@/components/icons/schedule.icons";
import { cn } from "@/lib/utils";

type WorkspaceTabsBarVariant = "workspace" | "titlebar";

type WorkspaceTabsBarProps = {
  variant?: WorkspaceTabsBarVariant;
  className?: string;
  noDragStyle?: CSSProperties;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

type TabIconComponent = ComponentType<{ className?: string }>;

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

const areTabOrdersEqual = (
  leftTabs: WorkspaceTab[],
  rightTabs: WorkspaceTab[],
): boolean => {
  if (leftTabs.length !== rightTabs.length) return false;

  return leftTabs.every((tab, index) => tab.id === rightTabs[index]?.id);
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

const HomeIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4z" fill="currentColor" />
  </svg>
);

const ReviewIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M5 7h14l1.5 10H15l-1.3 2h-3.4L9 17H3.5z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const resolveTabIcon = (tab: WorkspaceTab): TabIconComponent => {
  if (tab.kind === "route") {
    if (tab.sectionKey === "home") return HomeIcon;
    if (tab.sectionKey === "review") return ReviewIcon;
    if (tab.sectionKey === "schedule") return Calendar;
  }

  if (tab.kind === "explorer") return FolderIcon;
  if (tab.kind === "cardSet") return Layers;

  return FileText;
};

export const WorkspaceTabsBar = ({
  variant = "workspace",
  className,
  noDragStyle,
}: WorkspaceTabsBarProps) => {
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

  const tabsListRef = useRef<HTMLDivElement | null>(null);
  const suppressTabClickRef = useRef(false);
  const isDraggingTabsRef = useRef(false);
  const orderedTabsRef = useRef<WorkspaceTab[]>(tabs);
  const [orderedTabs, setOrderedTabs] = useState<WorkspaceTab[]>(tabs);
  const [openingTabId, setOpeningTabId] = useState<WorkspaceTab["id"] | null>(
    lastOpenedTabId,
  );
  const isTitlebar = variant === "titlebar";
  const canReorderTabs = orderedTabs.length > 1;
  const interactiveStyle = noDragStyle ?? TABS_NO_DRAG_STYLE;
  const tabsSurfaceStyle = resolveTabsSurfaceStyle(isTitlebar);
  const closeButtonClassName = resolveCloseButtonClassName(isTitlebar);
  const addButtonClassName = resolveAddButtonClassName(isTitlebar);

  useEffect(() => {
    if (isDraggingTabsRef.current) return;

    orderedTabsRef.current = tabs;
    setOrderedTabs(tabs);
  }, [tabs]);

  useEffect(() => {
    if (!lastOpenedTabId) {
      setOpeningTabId(null);
      return;
    }

    setOpeningTabId(lastOpenedTabId);

    const timeoutId = window.setTimeout(() => {
      setOpeningTabId((currentTabId) =>
        currentTabId === lastOpenedTabId ? null : currentTabId,
      );
    }, TAB_OPEN_ANIMATION_MS);

    return () => window.clearTimeout(timeoutId);
  }, [lastOpenedTabId]);

  const commitReorderedTabs = () => {
    const currentTabs = useWorkspaceTabsStore.getState().tabs;
    const nextTabs = orderedTabsRef.current;

    if (!areTabOrdersEqual(currentTabs, nextTabs)) {
      reorderTabs(nextTabs);
    }

    const committedTabs = useWorkspaceTabsStore.getState().tabs;
    orderedTabsRef.current = committedTabs;
    setOrderedTabs(committedTabs);
  };

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
        <Reorder.Group
          ref={tabsListRef}
          as="div"
          axis="x"
          values={orderedTabs}
          onReorder={(nextTabs) => {
            if (!canReorderTabs) return;

            orderedTabsRef.current = nextTabs;
            setOrderedTabs(nextTabs);
          }}
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
              <Reorder.Item
                key={tab.id}
                as="div"
                value={tab}
                drag={canReorderTabs ? "x" : false}
                dragListener={canReorderTabs}
                dragConstraints={tabsListRef}
                dragElastic={canReorderTabs ? 0.08 : 0}
                dragMomentum={false}
                onDragStart={() => {
                  isDraggingTabsRef.current = true;
                  suppressTabClickRef.current = true;
                }}
                onDragEnd={() => {
                  isDraggingTabsRef.current = false;
                  commitReorderedTabs();

                  window.setTimeout(() => {
                    suppressTabClickRef.current = false;
                  }, 0);
                }}
                transition={{ type: "spring", stiffness: 520, damping: 42 }}
                style={resolveTabSlotLayoutStyle(tab, interactiveStyle)}
                className={cn(
                  "explorer-workspace-tab-slot relative flex min-w-[92px] max-w-[180px] flex-[1_1_150px] items-end overflow-visible",
                  canReorderTabs
                    ? "cursor-grab active:cursor-grabbing"
                    : "cursor-default",
                )}
                data-workspace-tab-kind={tab.kind}
                data-workspace-tab-slot-active={selected ? "true" : undefined}
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
                      if (suppressTabClickRef.current) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                      }

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
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <button
          type="button"
          style={interactiveStyle}
          className={addButtonClassName}
          aria-label="新しいエクスプローラータブを開く"
          title="新しいエクスプローラータブ"
          onClick={() => {
            createExplorerTab();
            navigate("/library?view=section-list&libraryType=pdf");
          }}
        >
          <PlusLineIcon className="h-4 w-4" />
        </button>

        <div className="h-full min-w-0 flex-1" />
      </div>
    </>
  );
};