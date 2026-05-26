import { useMemo, useState } from "react";
import type { CalendarWorkspaceToolbarProps } from "../scheduleScreen.types";
import { ToggleCalendarTimelineTask } from "../../../chip/toggle/Toggle.calendartimelinetask";
import { ToggleFolderTag, type FolderTagTab, type FolderTagToggleValue } from "../../../chip/toggle/Toggle.foldertag";
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
        <ToggleCalendarTimelineTask activeMode={activeMode} tabs={tabs} />
        <ToggleFolderTag activeMode={activeFolderTagMode} tabs={folderTagTabs} />
        <TaskTagStrip />
      </div>
    </div>
  );
};

export const CalendarWorkspaceToolbar = CalendarToolbar;
