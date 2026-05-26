import { useMemo, useState } from "react";
import type { CalendarWorkspaceToolbarProps } from "../scheduleScreen.types";
import { ToggleCalendarTimelineTask } from "../../../chip/toggle/Toggle.calendartimelinetask";
import { ToggleFolderTag, type FolderTagTab, type FolderTagToggleValue } from "../../../chip/toggle/Toggle.foldertag";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import { useCalendarToolbar } from "./hooks/useScheduleToolbar";
import { TaskTagStrip } from "./TaskTagStrip";

export const CalendarToolbar = ({
  activeMode,
  onSelectCalendar,
  onSelectTimeline,
  onSelectTask,
}: CalendarWorkspaceToolbarProps) => {
  const { tabs } = useCalendarToolbar({
    onSelectCalendar,
    onSelectTimeline,
    onSelectTask,
  });
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
    <div className="calendar-workspace-toolbar flex h-[var(--ds-semantic-breadcrumb-height)] w-full shrink-0 items-center justify-between overflow-visible bg-white pr-[var(--workspace-content-gutter)]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {shouldShowFolderTagToggle ? (
          <ToggleFolderTag activeMode={activeFolderTagMode} tabs={folderTagTabs} />
        ) : (
          <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
        )}
        <TaskTagStrip />
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
