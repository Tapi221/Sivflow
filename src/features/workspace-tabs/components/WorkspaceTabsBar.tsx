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
              "h-[50px] w-full min-w-0 border-b border-[#dde4db] bg-[rgba(248,250,246,0.92)]",
              "px-0 pt-0",
            ],
        className,
      )}
    >
      <div className="explorer-workspace-tabs-list flex min-w-0 max-w-[calc(100%-220px)] items-end overflow-hidden">
        {tabs.map((tab, index) => {
          const selected = tab.id === activeTabId;
          const Icon = resolveTabIcon(tab);

          return (
            <div
              key={tab.id}
              style={{ ...resolveTabStyle(tab), ...interactiveStyle }}
              data-workspace-tab-kind={tab.kind}
              data-workspace-tab-active={selected ? "true" : undefined}
              className={cn(
                "explorer-workspace-tab group/tab flex min-w-0 items-center overflow-hidden border text-[13px] transition-[background-color,border-color,color,box-shadow] duration-150",
                selected
                  ? "explorer-workspace-tab--active"
                  : "explorer-workspace-tab--inactive",
                index === 0 ? "ml-0" : "ml-2",
                "mb-0 h-[40px] rounded-t-[15px]",
                resolveTabWidthClassName(tab),
                selected
                  ? "border-[#dde4db] border-b-[rgba(255,255,252,0.98)] bg-[rgba(255,255,252,0.98)] text-[#24231f]"
                  : "border-[#e7ece5] border-b-transparent bg-[rgba(252,253,249,0.88)] text-[#6f786e] hover:bg-[rgba(255,255,252,0.96)] hover:text-[#33322f]",
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
                    selected ? "text-[#6a876e]" : "text-[#95a093]",
                  )}
                />
                <span className="truncate">{tab.title}</span>
              </button>

              {tab.isClosable ? (
                <button
                  type="button"
                  style={interactiveStyle}
                  className={cn(
                    "explorer-workspace-tab-close mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[10px] text-[#9fa69c] outline-none transition-colors",
                    "hover:bg-black/5 hover:text-[#55544f]",
                    selected
                      ? "opacity-100"
                      : "opacity-80 hover:opacity-100",
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
        className="explorer-workspace-tab-add mb-[6px] ml-3 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] border border-transparent text-[#8b8a84] outline-none transition-colors hover:bg-black/5 hover:text-[#45443f]"
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
