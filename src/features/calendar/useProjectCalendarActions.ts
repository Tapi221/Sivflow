import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createProjectCalendarLink, persistProjectCalendarLinks, readStoredProjectCalendarLinks } from "./projectCalendarLinks.storage";
import type { AppCalendarItem, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink } from "./scheduleScreen.types";
import { clearLegacyStoredAppProjects, normalizeRootFolderProjectLabel, readLegacyStoredAppProjects, useRootFolderProjects } from "./useRootFolderProjects";
import { createGoogleCalendar } from "@/integration/googlecalendar-integration/gcal.api";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";



type CreateGoogleProjectCalendarLinkInput = {
  project: AppCalendarItem; accountId: string; calendar: GoogleCalendarListItem; color: string; createdByApp: boolean; };
type UseProjectCalendarActionsInput = {
  googleAccounts: GoogleAccountDisplay[];
  reconnectGoogleAccount: (accountId: string) => void | Promise<void>;
  toggleGoogleCalendar: (accountId: string, calendarId: string) => void;
};
type UseProjectCalendarActionsResult = {
  appProjects: AppCalendarItem[];
  projectCalendarLinks: ProjectCalendarLink[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
  googleAccountsWithColorOverrides: GoogleAccountDisplay[];
  handleAddAppProject: (projectName: string) => void;
  handleToggleAppProject: (projectId: string) => void;
  handleLinkGoogleCalendarAsProject: (accountId: string, calendarId: string) => void;
  handleLinkProjectToGoogleCalendar: (projectId: string, accountId: string, calendarId: string) => void;
  handleCreateProjectGoogleCalendar: (projectId: string, accountId: string) => void;
  handleUnlinkProjectCalendar: (linkId: string) => void;
  handleChangeGoogleCalendarColor: (accountId: string, calendarId: string, color: string) => void;
};



const GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY = "flashcard-master:schedule:google-calendar-color-overrides";



const isHexColor = (value: string): boolean => /^#[0-9a-f]{6}$/i.test(value);
const createGoogleCalendarColorOverrideKey = (accountId: string, calendarId: string): string => `${accountId}:${calendarId}`;
const readStoredGoogleCalendarColorOverrides = (): GoogleCalendarColorOverrideMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const overrides: GoogleCalendarColorOverrideMap = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (typeof value === "string" && isHexColor(value)) overrides[key] = value;
    });
    return overrides;
  } catch {
    return {};
  }
};
const persistGoogleCalendarColorOverrides = (overrides: GoogleCalendarColorOverrideMap) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GOOGLE_CALENDAR_COLOR_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage が使えない環境では React state の状態だけ維持する。
  }
};
const applyGoogleCalendarColorOverridesToAccounts = (accounts: GoogleAccountDisplay[], overrides: GoogleCalendarColorOverrideMap): GoogleAccountDisplay[] => accounts.map((account) => ({ ...account, calendars: account.calendars.map((calendar) => ({ ...calendar, backgroundColor: overrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor })) }));
const createGoogleProjectCalendarLink = ({ project, accountId, calendar, color, createdByApp }: CreateGoogleProjectCalendarLinkInput): ProjectCalendarLink => createProjectCalendarLink({ projectId: project.id, provider: "google", accountId, externalCalendarId: calendar.id, externalCalendarName: calendar.summaryOverride ?? calendar.summary, syncDirection: "importOnly", createdByApp, color, lastSyncedAt: new Date().toISOString() });
const useProjectCalendarActions = ({ googleAccounts, reconnectGoogleAccount, toggleGoogleCalendar }: UseProjectCalendarActionsInput): UseProjectCalendarActionsResult => {
  const didMigrateLegacyProjectsRef = useRef(false);
  const { appProjects, loading: rootFolderProjectsLoading, createRootFolderProject, findProjectByLabel, setProjectVisibility, toggleProject, updateRootFolderProjectColor } = useRootFolderProjects();
  const [projectCalendarLinks, setProjectCalendarLinks] = useState<ProjectCalendarLink[]>(readStoredProjectCalendarLinks);
  const [googleCalendarColorOverrides, setGoogleCalendarColorOverrides] = useState<GoogleCalendarColorOverrideMap>(readStoredGoogleCalendarColorOverrides);

  useEffect(() => {
    persistProjectCalendarLinks(projectCalendarLinks); }, [projectCalendarLinks]);
  useEffect(() => {
    persistGoogleCalendarColorOverrides(googleCalendarColorOverrides); }, [googleCalendarColorOverrides]);
  useEffect(() => {
    if (didMigrateLegacyProjectsRef.current || rootFolderProjectsLoading) return;
    const legacyProjects = readLegacyStoredAppProjects();
    if (legacyProjects.length === 0) return;
    didMigrateLegacyProjectsRef.current = true;
    void (async () => {
      const migratedProjectByLegacyId = new Map<string, AppCalendarItem>();
      const migratedProjectByNormalizedLabel = new Map(appProjects.map((project) => [normalizeRootFolderProjectLabel(project.label), project]));
      for (const legacyProject of legacyProjects) {
        const normalizedLabel = normalizeRootFolderProjectLabel(legacyProject.label);
        const existingProject = migratedProjectByNormalizedLabel.get(normalizedLabel) ?? findProjectByLabel(legacyProject.label);
        const project = existingProject ?? await createRootFolderProject({ label: legacyProject.label, color: legacyProject.color, checked: legacyProject.checked });
        if (!project) continue;
        migratedProjectByLegacyId.set(legacyProject.id, project);
        migratedProjectByNormalizedLabel.set(normalizedLabel, project);
        setProjectVisibility(project.id, legacyProject.checked);
      }
      if (migratedProjectByLegacyId.size > 0) {
        setProjectCalendarLinks((links) => links.map((link) => {
          const migratedProject = migratedProjectByLegacyId.get(link.projectId);
          return migratedProject ? { ...link, projectId: migratedProject.id, color: link.color ?? migratedProject.color } : link;
        }));
      }
      clearLegacyStoredAppProjects();
    })().catch((error) => {
      didMigrateLegacyProjectsRef.current = false;
      console.warn("[ScheduleScreen] legacy app project migration failed", error);
    });
  }, [appProjects, createRootFolderProject, findProjectByLabel, rootFolderProjectsLoading, setProjectVisibility]);

  const handleAddAppProject = useCallback((projectName: string) => {
    void createRootFolderProject({ label: projectName, checked: true }); }, [createRootFolderProject]);

  const handleToggleAppProject = useCallback((projectId: string) => {
    toggleProject(projectId); }, [toggleProject]);

  const linkProjectToGoogleCalendar = useCallback((project: AppCalendarItem, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem, createdByApp: boolean) => {
    const color = googleCalendarColorOverrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor ?? project.color;
    const link = createGoogleProjectCalendarLink({ project, accountId: account.accountId, calendar, color, createdByApp });
    setProjectVisibility(project.id, true);
    void updateRootFolderProjectColor(project.id, color);
    setProjectCalendarLinks((links) => links.some((item) => item.id === link.id) ? links.map((item) => item.id === link.id ? { ...item, ...link, projectId: project.id } : item) : [...links, link]);
    if (!account.selectedCalendarIds.has(calendar.id)) toggleGoogleCalendar(account.accountId, calendar.id);
  }, [googleCalendarColorOverrides, setProjectVisibility, toggleGoogleCalendar, updateRootFolderProjectColor]);

  const handleLinkProjectToGoogleCalendar = useCallback((projectId: string, accountId: string, calendarId: string) => {
    const project = appProjects.find((item) => item.id === projectId);
    const account = googleAccounts.find((item) => item.accountId === accountId);
    const calendar = account?.calendars.find((item) => item.id === calendarId);
    if (project && account && calendar) linkProjectToGoogleCalendar(project, account, calendar, false);
  }, [appProjects, googleAccounts, linkProjectToGoogleCalendar]);

  const handleCreateProjectGoogleCalendar = useCallback((projectId: string, accountId: string) => {
    void (async () => {
      const project = appProjects.find((item) => item.id === projectId);
      const account = googleAccounts.find((item) => item.accountId === accountId);
      if (!project || !account) return;
      if (!account.accessToken) {
        void reconnectGoogleAccount(accountId);
        return;
      }
      const calendar = await createGoogleCalendar({ accessToken: account.accessToken, summary: project.label });
      linkProjectToGoogleCalendar(project, { ...account, calendars: [...account.calendars, calendar] }, calendar, true);
    })().catch((error) => {
      console.warn("[ScheduleScreen] Google Calendar creation failed", error); });
  }, [appProjects, googleAccounts, linkProjectToGoogleCalendar, reconnectGoogleAccount]);

  const handleLinkGoogleCalendarAsProject = useCallback((accountId: string, calendarId: string) => {
    void (async () => {
      const account = googleAccounts.find((item) => item.accountId === accountId);
      const calendar = account?.calendars.find((item) => item.id === calendarId);
      if (!account || !calendar) return;
      const calendarLabel = calendar.summaryOverride ?? calendar.summary;
      const color = googleCalendarColorOverrides[createGoogleCalendarColorOverrideKey(account.accountId, calendar.id)] ?? calendar.backgroundColor;
      const project = findProjectByLabel(calendarLabel) ?? await createRootFolderProject({ label: calendarLabel, color, checked: true });
      if (project) linkProjectToGoogleCalendar(project, account, calendar, false);
    })().catch((error) => {
      console.warn("[ScheduleScreen] Google Calendar project link failed", error); });
  }, [createRootFolderProject, findProjectByLabel, googleAccounts, googleCalendarColorOverrides, linkProjectToGoogleCalendar]);

  const handleUnlinkProjectCalendar = useCallback((linkId: string) => {
    setProjectCalendarLinks((links) => links.filter((link) => link.id !== linkId)); }, []);

  const handleChangeGoogleCalendarColor = useCallback((accountId: string, calendarId: string, color: string) => {
    if (!isHexColor(color)) return;
    const key = createGoogleCalendarColorOverrideKey(accountId, calendarId);
    const linkedProjectIds = projectCalendarLinks.filter((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId).map((link) => link.projectId);
    setGoogleCalendarColorOverrides((overrides) => ({ ...overrides, [key]: color }));
    setProjectCalendarLinks((links) => links.map((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId ? { ...link, color } : link));
    void Promise.all(Array.from(new Set(linkedProjectIds)).map((projectId) => updateRootFolderProjectColor(projectId, color))).catch((error) => {
      console.warn("[ScheduleScreen] root folder project color update failed", error); });
  }, [projectCalendarLinks, updateRootFolderProjectColor]);

  const googleAccountsWithColorOverrides = useMemo(() => applyGoogleCalendarColorOverridesToAccounts(googleAccounts, googleCalendarColorOverrides), [googleAccounts, googleCalendarColorOverrides]);

  return {
    appProjects,
    projectCalendarLinks,
    googleCalendarColorOverrides,
    googleAccountsWithColorOverrides,
    handleAddAppProject,
    handleToggleAppProject,
    handleLinkGoogleCalendarAsProject,
    handleLinkProjectToGoogleCalendar,
    handleCreateProjectGoogleCalendar,
    handleUnlinkProjectCalendar,
    handleChangeGoogleCalendarColor,
  };
};



export { useProjectCalendarActions };
