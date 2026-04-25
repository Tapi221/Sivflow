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

const resolveTabIcon = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") return FolderOutlineIcon;
  if (tab.kind === "cardSet") return Layers;
  return FileText;
};

const resolveTabWidthClassName = (tab: WorkspaceTab) => {
  if (tab.kind === "explorer") {
    return "w-[236px] max-w-[236px] flex-none";
  }

  return "min-w-[190px] max-w-[240px] shrink";
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
      className={cn(
        "explorer-chrome-font relative z-20 flex shrink-0 items-end gap-0 overflow-hidden",
        isTitlebar
          ? "h-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 pt-0"
          : "h-10 rounded-t-[14px] border border-b-0 border-[#dddcd5] bg-[rgba(246,246,244,0.96)] px-2 pt-1",
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
              className={cn(
                "group/tab mr-1 flex h-8 min-w-0 items-center overflow-hidden rounded-t-[8px] border text-[12.5px] transition-colors",
                resolveTabWidthClassName(tab),
                selected
                  ? "border-[#d8d7d1] border-b-white bg-white text-[#24231f] shadow-[0_-1px_0_rgba(255,255,255,0.85)_inset]"
                  : "border-transparent bg-transparent text-[#777671] hover:bg-white/60 hover:text-[#33322f]",
              )}
            >
              <button
                type="button"
                style={noDragStyle}
                className="flex h-full min-w-0 flex-1 items-center gap-2 px-3 text-left outline-none"
                aria-current={selected ? "page" : undefined}
                title={tab.title}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => selectTab(tab.id)}
              >
                <Icon
                  className={cn(
                    "h-3.5 w-3.5 shrink-0",
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
                    "mr-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#aaa9a3] outline-none transition-colors",
                    "hover:bg-black/10 hover:text-[#55544f]",
                    selected ? "opacity-100" : "opacity-0 group-hover/tab:opacity-100",
                  )}
                  aria-label={`${tab.title} を閉じる`}
                  title="閉じる"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        style={noDragStyle}
        className="mb-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#8b8a84] outline-none transition-colors hover:bg-black/5 hover:text-[#45443f]"
        aria-label="新しいエクスプローラータブを開く"
        title="新しいエクスプローラータブ"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => {
          createExplorerTab();
        }}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
