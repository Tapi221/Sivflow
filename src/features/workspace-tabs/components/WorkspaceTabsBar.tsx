import type { CSSProperties } from "react";

import { FileText, FolderOutlineIcon, Layers, Plus, X } from "@/ui/icons";
import { cn } from "@/lib/utils";
import type { WorkspaceTab } from "@/features/workspace-tabs/domain/workspaceTab";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";

type WorkspaceTabsBarVariant = "workspace" | "titlebar";

type WorkspaceTabsBarProps = {
  variant?: WorkspaceTabsBarVariant;
  className?: string;
  noDragStyle?: CSSProperties;
};

type AppRegionStyle = CSSProperties & {
  WebkitAppRegion?: "drag" | "no-drag";
};

const TABS_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "drag",
};

const TABS_NO_DRAG_STYLE: AppRegionStyle = {
  WebkitAppRegion: "no-drag",
};

const resolveTabIcon = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") return FolderOutlineIcon;
  if (tab.kind === "cardSet") return Layers;
  return FileText;
};

const resolveTabWidthClassName = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") {
    return "shrink-0";
  }

  return "min-w-[180px] max-w-[240px] shrink";
};

const resolveTabStyle = (tab: WorkspaceTab): CSSProperties | undefined => {
  if (tab.kind !== "explorer") {
    return undefined;
  }

  return {
    width: "min(var(--workspace-explorer-tab-width, 260px), 280px)",
    maxWidth: "280px",
    flexBasis: "min(var(--workspace-explorer-tab-width, 260px), 280px)",
  };
};

export const WorkspaceTabsBar = ({
  variant = "workspace",
  className,
  noDragStyle,
}: WorkspaceTabsBarProps) => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const selectTab = useWorkspaceTabsStore((state) => state.selectTab);
  const closeTab = useWorkspaceTabsStore((state) => state.closeTab);
  const createExplorerTab = useWorkspaceTabsStore(
    (state) => state.createExplorerTab,
  );

  const isTitlebar = variant === "titlebar";
  const interactiveStyle = isTitlebar
    ? noDragStyle
    : (noDragStyle ?? TABS_NO_DRAG_STYLE);

  return (
    <div
      style={isTitlebar ? noDragStyle : TABS_DRAG_STYLE}
      className={cn(
        "explorer-chrome-font relative z-30 flex shrink-0 items-end gap-0 overflow-hidden",
        isTitlebar
          ? "h-full min-w-0 flex-1 bg-transparent px-0 pt-0"
          : [
              "h-10 w-full min-w-0 border-b border-[#e0e0e0] bg-[#f5f5f5]",
              "px-0 pt-0",
            ],
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-end overflow-hidden">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTabId;
          const Icon = resolveTabIcon(tab);

          return (
            <div
              key={tab.id}
              style={{ ...resolveTabStyle(tab), ...interactiveStyle }}
              className={cn(
                "group/tab flex min-w-0 items-center overflow-hidden border text-[13px] transition-colors",
                index === 0 ? "ml-0" : "ml-1",
                selected
                  ? "mb-[-1px] h-10 rounded-t-[10px]"
                  : "mb-[5px] h-7 rounded-[7px]",
                resolveTabWidthClassName(tab),
                selected
                  ? "border-[#e0e0e0] border-b-white bg-white text-[#1a1a1a]"
                  : "border-transparent bg-transparent text-[#6b6b6b] hover:bg-[#eeeeee] hover:text-[#1a1a1a]",
              )}
            >
              <button
                type="button"
                style={interactiveStyle}
                className={cn(
                  "flex h-full min-w-0 flex-1 items-center gap-2 text-left outline-none",
                  selected ? "px-4" : "px-3",
                )}
                aria-current={selected ? "page" : undefined}
                title={tab.title}
                onClick={() => selectTab(tab.id)}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    selected ? "text-[#6b6b6b]" : "text-[#9e9e9e]",
                  )}
                />
                <span className="truncate">{tab.title}</span>
              </button>

              {tab.isClosable ? (
                <button
                  type="button"
                  style={interactiveStyle}
                  className={cn(
                    "mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#9e9e9e] outline-none transition-colors",
                    "hover:bg-black/10 hover:text-[#4b4b4b]",
                    selected ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
                  )}
                  aria-label={`${tab.title} を閉じる`}
                  title="閉じる"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        style={interactiveStyle}
        className="mb-[5px] mr-2 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#6b6b6b] outline-none transition-colors hover:bg-[#eeeeee] hover:text-[#1a1a1a]"
        aria-label="新しいエクスプローラータブを開く"
        title="新しいエクスプローラータブ"
        onClick={() => {
          createExplorerTab();
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
