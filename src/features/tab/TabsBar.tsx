import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import { resolveWorkspaceTabRoute } from "@/features/tab/resolveTabRoute";
import type { WorkspaceTab } from "@/features/tab/Tab";
import { FileText, Layers, Plus, X } from "@/ui/icons";
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

type IconProps = {
  className?: string;
};

type TabIndicator = {
  left: number;
  width: number;
  visible: boolean;
};

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

const IconShell = ({
  children,
  className,
}: IconProps & { children: ReactNode }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {children}
  </svg>
);

const HomeIcon = ({ className }: IconProps) => (
  <IconShell className={className}>
    <path
      d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4v-9.5Z"
      fill="currentColor"
    />
  </IconShell>
);

const ReviewIcon = ({ className }: IconProps) => (
  <IconShell className={className}>
    <path
      d="M5 7h14l1.5 10H15l-1.3 2h-3.4L9 17H3.5L5 7Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </IconShell>
);

const CalendarIcon = ({ className }: IconProps) => (
  <IconShell className={className}>
    <path
      d="M18 2V4M6 2V4M10 17V13.347C10 13.156 9.863 13 9.695 13H9M13.63 17L14.984 13.35C15.047 13.179 14.913 13 14.721 13H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8H18M2.5 12.243C2.5 7.886 2.5 5.707 3.752 4.353C5.004 3 7.02 3 11.05 3H12.95C16.98 3 18.996 3 20.248 4.354C21.5 5.707 21.5 7.886 21.5 12.244V12.757C21.5 17.114 21.5 19.293 20.248 20.647C18.996 22 16.98 22 12.95 22H11.05C7.02 22 5.004 22 3.752 20.646C2.5 19.293 2.5 17.114 2.5 12.756V12.243Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconShell>
);

const LibraryTabIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3.75 3C3.28587 3 2.84075 3.18437 2.51256 3.51256C2.18437 3.84075 2 4.28587 2 4.75V8.01C2.52239 7.67577 3.12984 7.49875 3.75 7.5H16.25C16.894 7.5 17.495 7.688 18 8.01V6.75C18 6.28587 17.8156 5.84075 17.4874 5.51256C17.1592 5.18437 16.7141 5 16.25 5H11.414C11.3811 5.00006 11.3486 4.99364 11.3182 4.98112C11.2879 4.96859 11.2603 4.9502 11.237 4.927L9.823 3.513C9.49499 3.18476 9.05004 3.00023 8.586 3H3.75ZM3.75 9C3.28587 9 2.84075 9.18437 2.51256 9.51256C2.18437 9.84075 2 10.2859 2 10.75V15.25C2 16.216 2.784 17 3.75 17H16.25C16.7141 17 17.1592 16.8156 17.4874 16.4874C17.8156 16.1592 18 15.7141 18 15.25V10.75C18 10.2859 17.8156 9.84075 17.4874 9.51256C17.1592 9.18437 16.7141 9 16.25 9H3.75Z"
      fill="currentColor"
    />
  </svg>
);

const resolveTabIcon = (tab: WorkspaceTab) => {
  if (tab.kind === "route") {
    if (tab.sectionKey === "home") return HomeIcon;
    if (tab.sectionKey === "review") return ReviewIcon;
    if (tab.sectionKey === "schedule") return CalendarIcon;
  }

  if (tab.kind === "explorer") return LibraryTabIcon;
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
  const createExplorerTab = useWorkspaceTabsStore(
    (state) => state.createExplorerTab,
  );

  const listRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [indicator, setIndicator] = useState<TabIndicator>({
    left: 0,
    width: 0,
    visible: false,
  });

  const isTitlebar = variant === "titlebar";
  const interactiveStyle = noDragStyle ?? TABS_NO_DRAG_STYLE;
  const tabsSurfaceStyle = resolveTabsSurfaceStyle(isTitlebar);
  const closeButtonClassName = resolveCloseButtonClassName(isTitlebar);
  const addButtonClassName = resolveAddButtonClassName(isTitlebar);

  const updateIndicator = useCallback(() => {
    const listEl = listRef.current;
    const activeTabEl = activeTabId ? tabRefs.current[activeTabId] : null;

    if (!listEl || !activeTabEl) {
      setIndicator((current) =>
        current.visible ? { ...current, visible: false } : current,
      );

      return;
    }

    const listRect = listEl.getBoundingClientRect();
    const tabRect = activeTabEl.getBoundingClientRect();
    const nextIndicator = {
      left: Math.round(tabRect.left - listRect.left),
      width: Math.round(tabRect.width),
      visible: true,
    };

    setIndicator((current) => {
      const sameLeft = Math.abs(current.left - nextIndicator.left) < 0.5;
      const sameWidth = Math.abs(current.width - nextIndicator.width) < 0.5;

      if (sameLeft && sameWidth && current.visible === nextIndicator.visible) {
        return current;
      }

      return nextIndicator;
    });
  }, [activeTabId]);

  useLayoutEffect(() => {
    const frameId = window.requestAnimationFrame(updateIndicator);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [tabs, updateIndicator]);

  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateIndicator);

      return () => {
        window.removeEventListener("resize", updateIndicator);
      };
    }

    const resizeObserver = new ResizeObserver(updateIndicator);

    if (listRef.current) {
      resizeObserver.observe(listRef.current);
    }

    tabs.forEach((tab) => {
      const tabEl = tabRefs.current[tab.id];

      if (tabEl) {
        resizeObserver.observe(tabEl);
      }
    });

    window.addEventListener("resize", updateIndicator);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateIndicator);
    };
  }, [tabs, updateIndicator]);

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
        <div
          ref={listRef}
          className="explorer-tab-list explorer-workspace-tabs-list relative flex min-w-0 items-end gap-0 overflow-visible"
        >
          <div
            aria-hidden="true"
            style={{
              ...ACTIVE_TAB_SURFACE_STYLE,
              ...ACTIVE_TAB_JOIN_STYLE,
              left: indicator.left,
              width: indicator.width,
            }}
            className={cn(
              "pointer-events-none absolute bottom-[-1px] z-0 h-[33px] rounded-t-[10px]",
              "transition-[opacity,left,width] duration-[320ms] ease-[cubic-bezier(.22,1,.36,1)]",
              "motion-reduce:transition-none",
              indicator.visible ? "opacity-100" : "opacity-0",
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

          {tabs.map((tab) => {
            const selected = tab.id === activeTabId;
            const isOpening = tab.id === lastOpenedTabId;
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
                "z-[3] text-[var(--app-sidebar-text-strong)] shadow-none";
              iconStateClassName =
                "text-[var(--ds-semantic-color-interactive-selected-accent)]";
              closeButtonStateClassName =
                "opacity-100 !text-[#6f7681] hover:!bg-black/5 hover:!text-[#2f3640]";
            }

            return (
              <motion.div
                key={tab.id}
                layout
                transition={{ type: "spring", stiffness: 520, damping: 42 }}
                className="explorer-workspace-tab-slot relative flex min-w-[92px] max-w-[180px] flex-[1_1_150px] items-end overflow-visible"
                data-workspace-tab-slot-active={selected ? "true" : undefined}
              >
                <div
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;

                    if (!node) {
                      delete tabRefs.current[tab.id];
                    }
                  }}
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
                  <button
                    type="button"
                    style={interactiveStyle}
                    className="explorer-workspace-tab-button flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left outline-none"
                    aria-current={selected ? "page" : undefined}
                    title={tab.title}
                    onClick={() => {
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

                    <span className="truncate">{tab.title}</span>
                  </button>

                  {tab.isClosable ? (
                    <button
                      type="button"
                      style={interactiveStyle}
                      className={cn(
                        closeButtonClassName,
                        closeButtonStateClassName,
                      )}
                      aria-label={`${tab.title} を閉じる`}
                      title="閉じる"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        const nextTab = selected
                          ? resolveNextTabOnClose(tabs, tab.id)
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
              </motion.div>
            );
          })}
        </div>

        <button
          type="button"
          style={interactiveStyle}
          className={addButtonClassName}
          aria-label="新しいエクスプローラータブを開く"
          title="新しいエクスプローラータブ"
          onClick={() => {
            createExplorerTab();
            navigate("/folders?view=section-list");
          }}
        >
          <Plus className="h-4 w-4" />
        </button>

        <div className="h-full min-w-0 flex-1" />
      </div>
    </>
  );
};