import { useMemo, useState } from "react";
import { CalendarIcon } from "@/chip/icons/icons.sidebar";
import { ToggleFolderTag, type FolderTagTab, type FolderTagToggleValue } from "@/chip/toggle/Toggle.foldertag";
import { CalendarTagStrip } from "@/features/calendar/toolbar/CalendarTagStrip";
import type { CalendarWorkspaceToolbarProps } from "@/features/calendar/scheduleScreen.types";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";

export const CalendarToolbar = ({
  viewMode: _viewMode,
  onSelectViewMode: _onSelectViewMode,
}: CalendarWorkspaceToolbarProps) => {
  const workspaceTabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeWorkspaceSection = workspaceTabs.find(
    (tab) => tab.id === activeTabId,
  )?.sectionKey;
  const shouldShowFolderTagToggle = activeWorkspaceSection === "library";
  const [activeFolderTagMode, setActiveFolderTagMode] =
    useState<FolderTagToggleValue>("folder");
  const folderTagTabs = useMemo<FolderTagTab[]>(
    () => [
      {
        value: "folder",
        label: "Folder",
        onClick: () => setActiveFolderTagMode("folder"),
      },
      {
        value: "tag",
        label: "Tag",
        onClick: () => setActiveFolderTagMode("tag"),
      },
    ],
    [],
  );

  return (
    <div className="calendar-workspace-toolbar flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pl-[var(--workspace-content-gutter)] pr-[var(--workspace-content-gutter)]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {shouldShowFolderTagToggle ? (
          <ToggleFolderTag activeMode={activeFolderTagMode} tabs={folderTagTabs} />
        ) : (
          <>
            <div className="relative inline-grid h-8 w-max grid-flow-col items-center rounded-xl bg-[#f7f7f7] p-0.5" aria-label="Calendar">
              <div className="relative z-10 flex h-7 w-8 min-w-0 items-center justify-center rounded-lg border border-[#eeeeee] bg-white p-0 text-[#8c8c8c] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
                <CalendarIcon aria-hidden="true" className="block h-4 w-4 shrink-0 text-[#8c8c8c]" />
              </div>
            </div>
            <CalendarTagStrip />
          </>
        )}
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;