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

const resolveTabIcon = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") return FolderOutlineIcon;
  if (tab.kind === "cardSet") return Layers;
  return FileText;
};

const resolveTabWidthClassName = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") {
    return "shrink-0";
  }

  return "min-w-[190px] max-w-[240px] shrink";
};

const resolveTabStyle = (tab: WorkspaceTab): CSSProperties | undefined => {
  if (tab.kind !== "explorer") {
    return undefined;
  }

  return {
    width: "var(--workspace-explorer-tab-width, 320px)",
    maxWidth: "var(--workspace-explorer-tab-width, 320px)",
    flexBasis: "var(--workspace-explorer-tab-width, 320px)",
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

  return (
    <div
      style={isTitlebar ? noDragStyle : TABS_DRAG_STYLE}
      className={cn(
        "explorer-chrome-font relative z-30 flex shrink-0 items-end gap-0 overflow-hidden",
        isTitlebar
          ? "h-full min-w-0 flex-1 bg-transparent px-0 pt-0"
          : [
              "h-11 w-full min-w-0 border-b border-[#dddcd5] bg-[rgba(246,246,244,0.98)]",
              "px-3 pt-1 shadow-[0_1px_0_rgba(255,255,255,0.75)_inset]",
            ],
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-end overflow-hidden">
        {tabs.map((tab) => {
          const selected = tab.id === activeTabId;
          const Icon = resolveTabIcon(tab);

          return (
            <div
              key={tab.id}
              style={resolveTabStyle(tab)}
              className={cn(
                "group/tab mr-1 flex h-10 min-w-0 items-center overflow-hidden rounded-t-[12px] border text-[13px] transition-colors",
                selected ? "mb-[-1px]" : "mb-[3px] h-8 rounded-t-[9px]",
                resolveTabWidthClassName(tab),
                selected
                  ? "border-[#dddcd5] border-b-white bg-white text-[#24231f] shadow-[0_-1px_0_rgba(255,255,255,0.9)_inset]"
                  : "border-transparent bg-transparent text-[#777671] hover:bg-white/65 hover:text-[#33322f]",
              )}
            >
              <button
                type="button"
                style={noDragStyle}
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
                    selected ? "text-[#6f6e69]" : "text-[#9b9a94]",
                  )}
                />
                <span className="truncate">{tab.title}</span>
              </button>

              {tab.isClosable ? (
                <button
                  type="button"
                  style={noDragStyle}
                  className={cn(
                    "mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#aaa9a3] outline-none transition-colors",
                    "hover:bg-black/10 hover:text-[#55544f]",
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
        style={noDragStyle}
        className="mb-[7px] inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8b8a84] outline-none transition-colors hover:bg-black/5 hover:text-[#45443f]"
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
