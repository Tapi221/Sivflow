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

  return "min-w-[190px] max-w-[260px] shrink";
};

const resolveTabStyle = (tab: WorkspaceTab): CSSProperties | undefined => {
  if (tab.kind !== "explorer") {
    return undefined;
  }

  return {
    width: "min(var(--workspace-explorer-tab-width, 248px), 280px)",
    maxWidth: "280px",
    flexBasis: "min(var(--workspace-explorer-tab-width, 248px), 280px)",
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
  const interactiveStyle = noDragStyle ?? TABS_NO_DRAG_STYLE;

  return (
    <div
      style={interactiveStyle}
      className={cn(
        "explorer-chrome-font explorer-workspace-tabs-bar relative z-30 flex shrink-0 items-end gap-0 overflow-hidden",
        isTitlebar
          ? "h-full min-w-0 flex-1 bg-transparent px-0 pt-0"
          : [
              "h-[40px] w-full min-w-0 border-b border-[#c7c9cc] bg-[#d5d7da]",
              "px-1.5 pt-0",
            ],
        className,
      )}
    >
      <div className="explorer-workspace-tabs-list flex min-w-0 max-w-[calc(100%-90px)] items-end overflow-hidden gap-1">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTabId;
          const Icon = resolveTabIcon(tab);

          return (
            <div key={tab.id} className="relative flex items-end">
              <div
                style={{ ...resolveTabStyle(tab), ...interactiveStyle }}
                data-workspace-tab-kind={tab.kind}
                data-workspace-tab-active={selected ? "true" : undefined}
                className={cn(
                  "explorer-workspace-tab group/tab relative flex min-w-0 items-center overflow-hidden border text-[13px] transition-[background-color,border-color,color,box-shadow] duration-150",
                  selected
                    ? "explorer-workspace-tab--active"
                    : "explorer-workspace-tab--inactive",
                  index === 0 ? "ml-0" : "ml-0",
                  "mb-0 h-[34px] rounded-[10px]",
                  resolveTabWidthClassName(tab),
                  selected
                    ? "border-[#c6c8cb] bg-white text-black"
                    : "border-[#cfd1d4] bg-[#eceef1] text-black/80 hover:bg-white hover:text-black",
                )}
              >
                <button
                  type="button"
                  style={interactiveStyle}
                  className={cn(
                    "explorer-workspace-tab-button flex h-full min-w-0 flex-1 items-center gap-2.5 text-left outline-none",
                    selected ? "px-4" : "px-4",
                  )}
                  aria-current={selected ? "page" : undefined}
                  title={tab.title}
                  onClick={() => selectTab(tab.id)}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selected ? "text-[#6a876e]" : "text-[#7e8791]",
                    )}
                  />
                  <span className="truncate">{tab.title}</span>
                </button>

                {tab.isClosable ? (
                  <button
                    type="button"
                    style={interactiveStyle}
                    className={cn(
                      "explorer-workspace-tab-close mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#7e8791] outline-none transition-colors",
                      "hover:bg-black/5 hover:text-[#333]",
                      selected ? "opacity-100" : "opacity-80 hover:opacity-100",
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
            </div>
          );
        })}
      </div>

      <button
        type="button"
        style={interactiveStyle}
        className="explorer-workspace-tab-add mb-[1px] ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] border border-transparent text-[#6f7680] outline-none transition-colors hover:bg-white/70 hover:text-[#2c2f35]"
        aria-label="新しいエクスプローラータブを開く"
        title="新しいエクスプローラータブ"
        onClick={() => {
          createExplorerTab();
        }}
      >
        <Plus className="h-4 w-4" />
      </button>

      <div className="h-full min-w-0 flex-1" />
    </div>
  );
};
