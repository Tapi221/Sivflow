import { type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GoogleIcon } from "@/chip/icons/icons.schedule";
import { CALENDAR_LIST_MENU_HEIGHT, CALENDAR_LIST_MENU_PANEL_ID, CALENDAR_LIST_MENU_WIDTH, CalendarListMenu, type CalendarListMenuAction } from "@/chip/rightclickpanel.desktop/CalendarListMenu.desktop";
import { getProjectCalendarLinksMenuHeight, PROJECT_CALENDAR_LINKS_MENU_PANEL_ID, PROJECT_CALENDAR_LINKS_MENU_WIDTH, ProjectCalendarLinksMenu, type ProjectCalendarLinksMenuAction } from "@/chip/rightclickpanel.desktop/ProjectCalendarLinksMenu.desktop";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow } from "@/features/calendar/panel/SelectableGoogleSourceRow";
import type { AppCalendarItem, CalendarSidebarProps, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import { cn } from "@/lib/utils";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { useT } from "@shared/i18n/useT";

type CalendarContextMenuState = { accountId: string; calendarId: string; calendarName: string; color: string; x: number; y: number };

type MatchingGoogleCalendarTarget = { account: GoogleAccountDisplay; calendar: GoogleCalendarListItem };

type ProjectLinksContextMenuState = { project: AppCalendarItem; links: ProjectCalendarLink[]; matchingGoogleCalendars: MatchingGoogleCalendarTarget[]; x: number; y: number };

type CalendarColorPickerTarget = { accountId: string; calendarId: string };

type ContextMenuTriggerEvent = ReactMouseEvent<HTMLElement>;

type CalendarSidebarContentProps = CalendarSidebarProps & { className?: string };

type AppProjectsSectionProps = { projects: AppCalendarItem[]; isAdding: boolean; onAddProject: (projectName: string) => void; onToggleProject: (projectId: string) => void; onOpenProjectLinksContextMenu: (event: ContextMenuTriggerEvent, project: AppCalendarItem) => void; onAddingChange: (isAdding: boolean) => void };

type GoogleCalendarSourceRowProps = { account: GoogleAccountDisplay; calendar: GoogleCalendarListItem; color: string; onToggleCalendar: (calendarId: string) => void; onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void };

type ProjectLinkedGoogleCalendarRowProps = { calendar: GoogleCalendarListItem; color: string };

type ProjectLinkedGoogleCalendarsSectionProps = { account: GoogleAccountDisplay; calendars: GoogleCalendarListItem[]; googleCalendarColorOverrides: GoogleCalendarColorOverrideMap };

type GoogleAccountsSectionProps = { accounts: GoogleAccountDisplay[]; isConnecting: boolean; projectCalendarLinks: ProjectCalendarLink[]; googleCalendarColorOverrides: GoogleCalendarColorOverrideMap; onAddCalendar: () => void; onToggleCalendar: (accountId: string, calendarId: string) => void; onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void; onReconnectAccount: (accountId: string) => void };

type GoogleAccountSectionProps = { account: GoogleAccountDisplay; projectCalendarLinks: ProjectCalendarLink[]; googleCalendarColorOverrides: GoogleCalendarColorOverrideMap; onToggleCalendar: (calendarId: string) => void; onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void; onReconnect: () => void };

const DEFAULT_CALENDAR_COLOR = "#74798b";
const ADD_PROJECT_EMPTY_MESSAGE = "プロジェクト名を入力してください";
const PROJECT_LINKED_GOOGLE_CALENDARS_LABEL = "プロジェクトに追加したカレンダー";
const GOOGLE_CALENDAR_SECTION_LABEL = "Google Calendar";
const ADD_GOOGLE_CALENDAR_LABEL = "Googleカレンダーを追加";
const CONNECTING_GOOGLE_CALENDAR_LABEL = "接続中...";
const CALENDAR_CONTEXT_MENU_DIMENSIONS = { width: CALENDAR_LIST_MENU_WIDTH, height: CALENDAR_LIST_MENU_HEIGHT };
const COLOR_INPUT_STYLE: CSSProperties = { position: "fixed", left: -9999, top: -9999, width: 1, height: 1, opacity: 0, pointerEvents: "none" };

const createGoogleCalendarColorOverrideKey = (accountId: string, calendarId: string): string => `${accountId}:${calendarId}`;

const normalizeProjectCalendarName = (value: string): string => value.trim().toLowerCase();

const getGoogleCalendarName = (calendar: GoogleCalendarListItem): string => calendar.summaryOverride ?? calendar.summary;

const getProjectLinks = (projectId: string, links: ProjectCalendarLink[]): ProjectCalendarLink[] => links.filter((link) => link.projectId === projectId);

const getLinkedGoogleCalendarLink = (accountId: string, calendarId: string, links: ProjectCalendarLink[]): ProjectCalendarLink | null => links.find((link) => link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId) ?? null;

const getProjectLinkProviderLabel = (link: ProjectCalendarLink): string => {
  switch (link.provider) {
    case "google":
      return "Google";
    case "appleEventKit":
      return "Apple";
    case "appleCalDav":
      return "iCloud";
    case "local":
    default:
      return "Local";
  }
};

const getEmailLocalPart = (email: string): string => {
  const [localPart] = email.split("@");
  return localPart.trim() || email;
};

const getGoogleAccountLabel = (account: GoogleAccountDisplay): string => account.email ? getEmailLocalPart(account.email) : account.name ?? "Google";

const isLinkedGoogleCalendar = (accountId: string, calendarId: string, links: ProjectCalendarLink[]): boolean => getLinkedGoogleCalendarLink(accountId, calendarId, links) !== null;

const isGoogleCalendarLinkedToProject = (projectId: string, accountId: string, calendarId: string, links: ProjectCalendarLink[]): boolean => links.some((link) => link.projectId === projectId && link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId);

const resolveCalendarColor = (accountId: string, calendar: GoogleCalendarListItem, overrides: GoogleCalendarColorOverrideMap): string => overrides[createGoogleCalendarColorOverrideKey(accountId, calendar.id)] ?? calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR;

const findMatchingGoogleCalendarsForProject = (project: AppCalendarItem, accounts: GoogleAccountDisplay[], links: ProjectCalendarLink[]): MatchingGoogleCalendarTarget[] => {
  const normalizedProjectName = normalizeProjectCalendarName(project.label);
  if (!normalizedProjectName) return [];

  return accounts.flatMap((account) => account.calendars.flatMap((calendar): MatchingGoogleCalendarTarget[] => {
    if (normalizeProjectCalendarName(getGoogleCalendarName(calendar)) !== normalizedProjectName) return [];
    if (isGoogleCalendarLinkedToProject(project.id, account.accountId, calendar.id, links)) return [];

    return [{ account, calendar }];
  }));
};

const createGoogleProjectLinkActionLabel = (target: MatchingGoogleCalendarTarget, targetCount: number): string => targetCount <= 1 ? "既存Googleカレンダーにリンク" : `既存Googleカレンダーにリンク: ${getGoogleAccountLabel(target.account)}`;

const createGoogleCalendarActionLabel = (account: GoogleAccountDisplay, accountCount: number): string => accountCount <= 1 ? "Googleカレンダーとして追加" : `Googleカレンダーとして追加: ${getGoogleAccountLabel(account)}`;

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconPlus = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const GoogleCalendarHeadingSvg = () => (
  <svg aria-hidden="true" className="block h-4 w-[118px] text-[#111111]" viewBox="0 0 118 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <text x="0" y="13" fill="currentColor" fontFamily="var(--app-font-family-sidebar)" fontSize="13" fontWeight="700" letterSpacing="0" textRendering="geometricPrecision">{GOOGLE_CALENDAR_SECTION_LABEL}</text>
  </svg>
);

const GoogleCalendarSourceRow = ({ account, calendar, color, onToggleCalendar, onOpenCalendarContextMenu }: GoogleCalendarSourceRowProps) => (
  <div onContextMenu={(event) => onOpenCalendarContextMenu(event, account, calendar)}>
    <SelectableGoogleSourceRow id={calendar.id} label={calendar.summary} checked={account.selectedCalendarIds.has(calendar.id)} color={color} onToggle={onToggleCalendar} />
  </div>
);

const ProjectLinkedGoogleCalendarRow = ({ calendar, color }: ProjectLinkedGoogleCalendarRowProps) => (
  <div className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "text-[#6d7380]")} title={getGoogleCalendarName(calendar)}>
    <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: color }} />
    </span>
    <span className="truncate text-[12px] font-medium text-[#8c9099]">{calendar.summary}</span>
  </div>
);

const ProjectLinkedGoogleCalendarsSection = ({ account, calendars, googleCalendarColorOverrides }: ProjectLinkedGoogleCalendarsSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  if (calendars.length === 0) return null;

  return (
    <div className="mt-1">
      <button type="button" className="group flex h-7 w-full items-center gap-1.5 rounded-[10px] px-1.5 text-left transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
        <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all duration-200 group-hover:bg-white group-hover:text-[#8c8c8c]", !isOpen && "-rotate-90")}>
          <IconChevronRight className="h-3 w-3" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-[#9a9a9a]">{PROJECT_LINKED_GOOGLE_CALENDARS_LABEL}</span>
        <span className="shrink-0 rounded-full bg-[#eef1f4] px-1.5 py-0.5 text-[10px] font-bold text-[#808894]">{calendars.length}</span>
      </button>
      {isOpen ? (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
          {calendars.map((calendar) => <ProjectLinkedGoogleCalendarRow key={calendar.id} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} />)}
        </div>
      ) : null}
    </div>
  );
};

const AppProjectsSection = ({ projects, isAdding, onAddProject, onToggleProject, onOpenProjectLinksContextMenu, onAddingChange }: AppProjectsSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddProject = () => {
    const trimmedProjectName = projectName.trim();
    if (!trimmedProjectName) {
      setAddError(ADD_PROJECT_EMPTY_MESSAGE);
      inputRef.current?.focus();
      return;
    }

    onAddProject(trimmedProjectName);
    setProjectName("");
    setAddError(null);
    onAddingChange(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handleAddProject();
  };

  const handleProjectNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    event.preventDefault();
    handleAddProject();
  };

  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {projects.map((project) => (
        <div key={project.id} onContextMenu={(event) => onOpenProjectLinksContextMenu(event, project)}>
          <SelectableGoogleSourceRow id={project.id} label={project.label} checked={project.checked} color={project.color} onToggle={onToggleProject} />
        </div>
      ))}
      {isAdding ? (
        <div className="mx-2 ml-2 mt-1 flex flex-col gap-1">
          <form className="flex h-7 items-center gap-1.5" onSubmit={handleSubmit}>
            <input ref={inputRef} value={projectName} onChange={(event) => { setProjectName(event.target.value); if (addError) setAddError(null); }} onKeyDown={handleProjectNameKeyDown} autoFocus placeholder="プロジェクト名" aria-label="プロジェクト名" aria-invalid={Boolean(addError)} aria-describedby={addError ? "app-project-add-error" : undefined} className={cn("min-w-0 flex-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#2f2f2f] outline-none transition focus:ring-2", addError ? "border border-[#e08b8b] focus:border-[#e08b8b] focus:ring-[#f9e8e8]" : "border border-[#e6e6e6] focus:border-[#d7d7d7] focus:ring-[#f2f2f2]")} />
            <button type="submit" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#6d7380] transition hover:bg-[#ececec] active:scale-[0.94]" aria-label="プロジェクトを追加">
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          </form>
          {addError ? <p id="app-project-add-error" className="px-3 text-[10px] font-semibold text-[#c25f5f]">{addError}</p> : null}
        </div>
      ) : null}
    </div>
  );
};

const GoogleAccountSection = ({ account, projectCalendarLinks, googleCalendarColorOverrides, onToggleCalendar, onOpenCalendarContextMenu, onReconnect }: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = getGoogleAccountLabel(account);
  const projectLinkedCalendars = useMemo(() => account.calendars.filter((calendar) => isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);
  const regularCalendars = useMemo(() => account.calendars.filter((calendar) => !isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);

  return (
    <div className="mt-1">
      <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
        <button type="button" className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-[10px] text-left transition-all duration-150 hover:text-[#5f6574]" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
          <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all duration-200 group-hover:bg-white group-hover:text-[#8c8c8c]", !isOpen && "-rotate-90")}>
            <IconChevronRight className="h-3 w-3" />
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-bold uppercase tracking-[0.04em] text-[#9a9a9a]">{accountName}</span>
        </button>
      </div>
      {isOpen ? (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {regularCalendars.map((calendar) => <GoogleCalendarSourceRow key={calendar.id} account={account} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} onToggleCalendar={onToggleCalendar} onOpenCalendarContextMenu={onOpenCalendarContextMenu} />)}
          <ProjectLinkedGoogleCalendarsSection account={account} calendars={projectLinkedCalendars} googleCalendarColorOverrides={googleCalendarColorOverrides} />
          {account.error ? (
            <div className="px-5 py-1 text-[11px] text-[#c25f5f]">
              <p>Google カレンダーを取得できませんでした。</p>
              <p className="mt-0.5 text-[#9a9a9a]">{account.error}</p>
              <button type="button" className="mt-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] font-semibold text-[#5f6574] transition hover:bg-[#ececec] active:scale-[0.97]" onClick={onReconnect}>再連携</button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

const GoogleAccountsSection = ({ accounts, isConnecting, projectCalendarLinks, googleCalendarColorOverrides, onAddCalendar, onToggleCalendar, onOpenCalendarContextMenu, onReconnectAccount }: GoogleAccountsSectionProps) => {
  const handleAddCalendar = useCallback(() => {
    if (isConnecting) return;
    onAddCalendar();
  }, [isConnecting, onAddCalendar]);

  return (
    <div className="mt-0.5">
      {accounts.length === 0 ? (
        <button type="button" className="ml-2 flex h-7 items-center gap-1.5 rounded-[10px] px-1.5 text-left text-[11px] font-semibold text-[#8c9099] transition hover:bg-[#f7f7f7] hover:text-[#5f6574] active:bg-[#f1f1f1] disabled:cursor-not-allowed disabled:opacity-60" onClick={handleAddCalendar} disabled={isConnecting}>
          <GoogleIcon className="size-[16px] shrink-0 text-[#5f6368]" label="Google" />
          <span>{isConnecting ? CONNECTING_GOOGLE_CALENDAR_LABEL : ADD_GOOGLE_CALENDAR_LABEL}</span>
        </button>
      ) : accounts.map((account) => <GoogleAccountSection key={account.accountId} account={account} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} onToggleCalendar={(calendarId) => onToggleCalendar(account.accountId, calendarId)} onOpenCalendarContextMenu={onOpenCalendarContextMenu} onReconnect={() => onReconnectAccount(account.accountId)} />)}
    </div>
  );
};

const CalendarSidebarContent = ({ appProjects, projectCalendarLinks, googleCalendarColorOverrides, googleAccounts, isAnyCalendarConnecting, onAddCalendar, onAddProject, onToggleProject, onLinkGoogleCalendarAsProject, onLinkProjectToGoogleCalendar, onCreateProjectGoogleCalendar, onUnlinkProjectCalendar, onChangeGoogleCalendarColor, onReconnectAccount, onToggleCalendar, className }: CalendarSidebarContentProps) => {
  const t = useT();
  const calendarContextMenuRef = useRef<HTMLDivElement | null>(null);
  const projectLinksContextMenuRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [calendarContextMenu, setCalendarContextMenu] = useState<CalendarContextMenuState | null>(null);
  const [projectLinksContextMenu, setProjectLinksContextMenu] = useState<ProjectLinksContextMenuState | null>(null);
  const [colorPickerTarget, setColorPickerTarget] = useState<CalendarColorPickerTarget | null>(null);

  useRightClickPanelDismiss(CALENDAR_LIST_MENU_PANEL_ID, calendarContextMenu !== null, calendarContextMenuRef, () => setCalendarContextMenu(null));
  useRightClickPanelDismiss(PROJECT_CALENDAR_LINKS_MENU_PANEL_ID, projectLinksContextMenu !== null, projectLinksContextMenuRef, () => setProjectLinksContextMenu(null));

  const handleStartAddingProject = useCallback(() => {
    setIsAddingProject(true);
  }, []);

  const handleAddGoogleCalendar = useCallback(() => {
    if (isAnyCalendarConnecting) return;
    onAddCalendar();
  }, [isAnyCalendarConnecting, onAddCalendar]);

  const handleOpenCalendarContextMenu = useCallback((event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => {
    event.preventDefault();
    event.stopPropagation();
    const { x, y } = clampRightClickPanelPosition(event.clientX, event.clientY, CALENDAR_CONTEXT_MENU_DIMENSIONS);
    setProjectLinksContextMenu(null);
    setCalendarContextMenu({ accountId: account.accountId, calendarId: calendar.id, calendarName: getGoogleCalendarName(calendar), color: resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides), x, y });
  }, [googleCalendarColorOverrides]);

  const handleOpenProjectLinksContextMenu = useCallback((event: ContextMenuTriggerEvent, project: AppCalendarItem) => {
    event.preventDefault();
    event.stopPropagation();
    const links = getProjectLinks(project.id, projectCalendarLinks);
    const matchingGoogleCalendars = findMatchingGoogleCalendarsForProject(project, googleAccounts, projectCalendarLinks);
    const createActionCount = googleAccounts.length === 0 ? 1 : googleAccounts.length;
    const actionCount = createActionCount + matchingGoogleCalendars.length + links.length;
    const { x, y } = clampRightClickPanelPosition(event.clientX, event.clientY, { width: PROJECT_CALENDAR_LINKS_MENU_WIDTH, height: getProjectCalendarLinksMenuHeight(actionCount) });
    setCalendarContextMenu(null);
    setProjectLinksContextMenu({ project, links, matchingGoogleCalendars, x, y });
  }, [googleAccounts, projectCalendarLinks]);

  const handleChangeCalendarColor = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!colorPickerTarget) return;
    onChangeGoogleCalendarColor(colorPickerTarget.accountId, colorPickerTarget.calendarId, event.target.value);
  }, [colorPickerTarget, onChangeGoogleCalendarColor]);

  const calendarMenuActions = useMemo<CalendarListMenuAction[]>(() => {
    if (!calendarContextMenu) return [];

    return [
      { id: "add-project", label: "プロジェクトに追加", onSelect: () => { onLinkGoogleCalendarAsProject(calendarContextMenu.accountId, calendarContextMenu.calendarId); setCalendarContextMenu(null); } },
      { id: "change-color", label: "色を変更", onSelect: () => { setColorPickerTarget({ accountId: calendarContextMenu.accountId, calendarId: calendarContextMenu.calendarId }); window.setTimeout(() => { if (!colorInputRef.current) return; colorInputRef.current.value = calendarContextMenu.color; colorInputRef.current.click(); }, 0); setCalendarContextMenu(null); } },
    ];
  }, [calendarContextMenu, onLinkGoogleCalendarAsProject]);

  const projectLinksMenuActions = useMemo<ProjectCalendarLinksMenuAction[]>(() => {
    if (!projectLinksContextMenu) return [];

    const createActions: ProjectCalendarLinksMenuAction[] = googleAccounts.length === 0 ? [{ id: "no-google-account", label: "Googleアカウントがありません", disabled: true, onSelect: () => undefined }] : googleAccounts.map((account) => ({ id: `create-google-${account.accountId}`, label: createGoogleCalendarActionLabel(account, googleAccounts.length), disabled: account.connectionStatus !== "connected", onSelect: () => { onCreateProjectGoogleCalendar(projectLinksContextMenu.project.id, account.accountId); setProjectLinksContextMenu(null); } }));
    const linkActions = projectLinksContextMenu.matchingGoogleCalendars.map((target) => ({ id: `link-google-${target.account.accountId}-${target.calendar.id}`, label: createGoogleProjectLinkActionLabel(target, projectLinksContextMenu.matchingGoogleCalendars.length), onSelect: () => { onLinkProjectToGoogleCalendar(projectLinksContextMenu.project.id, target.account.accountId, target.calendar.id); setProjectLinksContextMenu(null); } }));
    const unlinkActions = projectLinksContextMenu.links.map((link) => ({ id: `unlink-${link.id}`, label: `${getProjectLinkProviderLabel(link)}連携を解除`, onSelect: () => { onUnlinkProjectCalendar(link.id); setProjectLinksContextMenu(null); } }));
    return [...createActions, ...linkActions, ...unlinkActions];
  }, [googleAccounts, onCreateProjectGoogleCalendar, onLinkProjectToGoogleCalendar, onUnlinkProjectCalendar, projectLinksContextMenu]);

  const calendarContextMenuElement = calendarContextMenu ? <CalendarListMenu x={calendarContextMenu.x} y={calendarContextMenu.y} actions={calendarMenuActions} menuRef={calendarContextMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} /> : null;
  const projectLinksContextMenuElement = projectLinksContextMenu ? <ProjectCalendarLinksMenu x={projectLinksContextMenu.x} y={projectLinksContextMenu.y} actions={projectLinksMenuActions} menuRef={projectLinksContextMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} /> : null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden pb-0 text-[#2f2f2f]", className)}>
      <nav className="flex min-h-0 w-full flex-1 flex-col overflow-hidden pb-0" aria-label="カレンダー一覧">
        <div className="app-layered-directory__section-heading-row">
          <h2 className="app-layered-directory__section-heading">{t.myProjects}</h2>
          <button type="button" className="app-layered-directory__add-button" onClick={handleStartAddingProject} aria-label="プロジェクトを追加" title="プロジェクトを追加">
            <IconPlus className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="max-h-[55%] shrink-0 overflow-y-auto pb-1">
            <AppProjectsSection projects={appProjects} isAdding={isAddingProject} onAddProject={onAddProject} onToggleProject={onToggleProject} onOpenProjectLinksContextMenu={handleOpenProjectLinksContextMenu} onAddingChange={setIsAddingProject} />
          </div>
          <div className="shrink-0 pt-2">
            <div className="app-layered-directory__section-heading-row">
              <h2 className="app-layered-directory__section-heading" aria-label={GOOGLE_CALENDAR_SECTION_LABEL}>
                <GoogleCalendarHeadingSvg />
              </h2>
              <button type="button" className="app-layered-directory__add-button" onClick={handleAddGoogleCalendar} disabled={isAnyCalendarConnecting} aria-label={ADD_GOOGLE_CALENDAR_LABEL} title={ADD_GOOGLE_CALENDAR_LABEL}>
                <IconPlus className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pt-1">
            <GoogleAccountsSection accounts={googleAccounts} isConnecting={isAnyCalendarConnecting} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} onAddCalendar={handleAddGoogleCalendar} onToggleCalendar={onToggleCalendar} onOpenCalendarContextMenu={handleOpenCalendarContextMenu} onReconnectAccount={onReconnectAccount} />
          </div>
        </div>
      </nav>
      <input ref={colorInputRef} type="color" aria-label="カレンダー色" style={COLOR_INPUT_STYLE} onChange={handleChangeCalendarColor} />
      {calendarContextMenuElement ? createPortal(calendarContextMenuElement, document.body) : null}
      {projectLinksContextMenuElement ? createPortal(projectLinksContextMenuElement, document.body) : null}
    </div>
  );
};

const CalendarSidebar = (props: CalendarSidebarProps) => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const isLibrarySidebarActive = activeTab?.sectionKey === "library";

  if (isLibrarySidebarActive) return <SidebarLayeredDirectory />;
  return <SidebarLayeredDirectory calendarContent={<CalendarSidebarContent {...props} className="px-0 pt-2" />} />;
};

export { CalendarSidebar, CalendarSidebarContent };
