import { useMemo } from "react";
import { useProjectCalendarActions } from "@/features/calendar/useProjectCalendarActions";
import { useGoogleCalendarLayer } from "@/features/calendar/useGoogleCalendarLayer";
import type { GoogleAccountDisplay } from "@/features/calendar/scheduleScreen.types";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { CalendarSidebarContent } from "./CalendarSidebar";

type CalendarSidebarControllerProps = {
  onOpenSettings?: () => void;
  onToggleLeftPanel?: () => void;
};

const createGoogleAccountDisplays = (google: ReturnType<typeof useGoogleCalendarLayer>): GoogleAccountDisplay[] => google.googleAccounts.map((account) => {
  const taskListState = google.taskListsByAccount[account.id];
  const googleTasksState = google.googleTasksByAccount[account.id];

  return {
    accountId: account.id,
    email: account.email,
    name: account.name,
    photoUrl: account.photoUrl,
    accessToken: account.accessToken,
    calendars: account.calendars,
    taskLists: taskListState?.taskLists ?? [],
    taskListsError: taskListState?.error ?? null,
    isTaskListsLoading: taskListState?.isLoading ?? false,
    googleTasks: googleTasksState?.tasks ?? [],
    googleTasksError: googleTasksState?.error ?? null,
    selectedCalendarIds: account.selectedCalendarIds,
    connectionStatus: account.connectionStatus,
    error: account.error,
  };
});

const CalendarSidebarController = ({ onOpenSettings, onToggleLeftPanel }: CalendarSidebarControllerProps) => {
  const google = useGoogleCalendarLayer();
  const googleAccounts = useMemo(() => createGoogleAccountDisplays(google), [google]);
  const { appProjects, projectCalendarLinks, googleCalendarColorOverrides, googleAccountsWithColorOverrides, handleAddAppProject, handleToggleAppProject, handleLinkGoogleCalendarAsProject, handleLinkProjectToGoogleCalendar, handleCreateProjectGoogleCalendar, handleUnlinkProjectCalendar, handleChangeGoogleCalendarColor } = useProjectCalendarActions({ googleAccounts, reconnectGoogleAccount: google.reconnectAccount, toggleGoogleCalendar: google.toggleCalendar });

  return (
    <SidebarLayeredDirectory onOpenSettings={onOpenSettings} onToggleLeftPanel={onToggleLeftPanel} calendarContent={<CalendarSidebarContent appProjects={appProjects} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} googleAccounts={googleAccountsWithColorOverrides} isAnyCalendarConnecting={google.isAnyConnecting} onAddCalendar={google.addAccount} onAddProject={handleAddAppProject} onToggleProject={handleToggleAppProject} onLinkGoogleCalendarAsProject={handleLinkGoogleCalendarAsProject} onLinkProjectToGoogleCalendar={handleLinkProjectToGoogleCalendar} onCreateProjectGoogleCalendar={handleCreateProjectGoogleCalendar} onUnlinkProjectCalendar={handleUnlinkProjectCalendar} onChangeGoogleCalendarColor={handleChangeGoogleCalendarColor} onReconnectAccount={(accountId) => { void google.reconnectAccount(accountId); }} onToggleCalendar={google.toggleCalendar} className="px-0 pt-2" />} />
  );
};

export { CalendarSidebarController };
