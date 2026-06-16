import { useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SCHEDULE_SOURCE_COLOR } from "@shared/design-tokens/color/Color.Schedule";
import { useT } from "@shared/i18n/useT";
import { GoogleIcon } from "@web-renderer/chip/icons/icons.schedule";
import type { CalendarListMenuAction } from "@web-renderer/chip/panel/rightclickpanel.desktop/CalendarListMenu.desktop";
import { CALENDAR_LIST_MENU_HEIGHT, CALENDAR_LIST_MENU_PANEL_ID, CALENDAR_LIST_MENU_WIDTH, CalendarListMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/CalendarListMenu.desktop";
import type { ProjectCalendarLinksMenuAction } from "@web-renderer/chip/panel/rightclickpanel.desktop/ProjectCalendarLinksMenu.desktop";
import { getProjectCalendarLinksMenuHeight, PROJECT_CALENDAR_LINKS_MENU_PANEL_ID, PROJECT_CALENDAR_LINKS_MENU_WIDTH, ProjectCalendarLinksMenu } from "@web-renderer/chip/panel/rightclickpanel.desktop/ProjectCalendarLinksMenu.desktop";
import { clampRightClickPanelPosition, RIGHT_CLICK_PANEL_NO_DRAG_STYLE, useRightClickPanelDismiss } from "@web-renderer/chip/panel/rightClickPanel.utils";
import { cn } from "@web-renderer/lib/utils";
import type { ChangeEvent, CSSProperties, FormEvent, KeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow } from "@/features/calendar/panel/SelectableGoogleSourceRow";
import type { AppCalendarItem, CalendarSidebarProps, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import { SidebarLayeredDirectory } from "@/pane.desktop/leftpane/Sidebar.LayeredDirectory";



type CalendarContextMenuState = {
  accountId: string;
  calendarId: string;
  color: string;
  x: number;
  y: number;
};
type CalendarColorPickerTarget = {
  accountId: string;
  calendarId: string;
};
type ContextMenuTriggerEvent = ReactMouseEvent<HTMLElement>;
type MatchingGoogleCalendarTarget = {
  account: GoogleAccountDisplay;
  calendar: GoogleCalendarListItem;
};
type ProjectLinksContextMenuState = {
  project: AppCalendarItem;
  links: ProjectCalendarLink[];
  matchingGoogleCalendars: MatchingGoogleCalendarTarget[];
  x: number;
  y: number;
};
type CalendarSidebarContentProps = CalendarSidebarProps & {
  className?: string;
};
type CalendarSidebarHeadingProps = {
  heading: ReactNode;
  addLabel: string;
  onAdd: () => void;
  disabled?: boolean;
  headingAriaLabel?: string;
};
type AppProjectsSectionProps = {
  projects: AppCalendarItem[];
  isAdding: boolean;
  onAddProject: (projectName: string) => void;
  onToggleProject: (projectId: string) => void;
  onOpenProjectLinksContextMenu: (event: ContextMenuTriggerEvent, project: AppCalendarItem) => void;
  onAddingChange: (isAdding: boolean) => void;
};
type ProjectSourceRowProps = {
  project: AppCalendarItem;
  onToggleProject: (projectId: string) => void;
};
type GoogleCalendarSourceRowProps = {
  account: GoogleAccountDisplay;
  calendar: GoogleCalendarListItem;
  color: string;
  onToggleCalendar: (calendarId: string) => void;
  onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void;
};
type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  projectCalendarLinks: ProjectCalendarLink[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
  onToggleCalendar: (calendarId: string) => void;
  onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void;
  onReconnect: () => void;
};
type GoogleAccountsSectionProps = {
  accounts: GoogleAccountDisplay[];
  isConnecting: boolean;
  projectCalendarLinks: ProjectCalendarLink[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
  onAddCalendar: () => void;
  onToggleCalendar: (accountId: string, calendarId: string) => void;
  onOpenCalendarContextMenu: (event: ContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void;
  onReconnectAccount: (accountId: string) => void;
};
type IconProps = {
  className?: string;
};



const ADD_GOOGLE_CALENDAR_LABEL = "Googleカレンダーを追加";
const ADD_PROJECT_EMPTY_MESSAGE = "プロジェクト名を入力してください";
const ADD_PROJECT_LABEL = "プロジェクトを追加";
const CALENDAR_CONTEXT_MENU_DIMENSIONS = { width: CALENDAR_LIST_MENU_WIDTH, height: CALENDAR_LIST_MENU_HEIGHT };
const CALENDAR_SIDEBAR_COLOR_INPUT_CLASS_NAME = "pointer-events-none fixed left-0 top-0 h-px w-px -translate-x-full opacity-0";
const CALENDAR_SIDEBAR_CONTENT_CLASS_NAME = "pt-2";
const CALENDAR_SIDEBAR_GOOGLE_LIST_CLASS_NAME = "min-h-0 flex-1 overflow-y-auto px-4 pt-1";
const CALENDAR_SIDEBAR_HEADING_ROW_CLASS_NAME = "group flex min-h-6 items-center gap-1 px-4";
const CALENDAR_SIDEBAR_ADD_BUTTON_CLASS_NAME = "flex h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-stone-500 opacity-0 outline-none transition-all duration-150 hover:bg-stone-100 hover:text-stone-800 focus-visible:bg-stone-100 focus-visible:text-stone-800 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100 disabled:cursor-not-allowed disabled:opacity-40";
const CALENDAR_SIDEBAR_HEADING_CLASS_NAME = "m-0 min-w-0 flex-1 truncate text-sm font-bold leading-5 text-neutral-950";
const CALENDAR_SIDEBAR_PROJECT_LIST_CLASS_NAME = "max-h-80 shrink-0 overflow-y-auto px-4 pb-1";
const CALENDAR_SIDEBAR_ROW_CONTENT_CLASS_NAME = "pl-0";
const CONNECTING_GOOGLE_CALENDAR_LABEL = "接続中...";
const DEFAULT_CALENDAR_COLOR = SCHEDULE_SOURCE_COLOR.calendarFallback;
const GOOGLE_CALENDAR_SECTION_LABEL = "Google Calendar";
const PROJECT_LINKED_GOOGLE_CALENDARS_LABEL = "プロジェクトに追加したカレンダー";



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
  const trimmedLocalPart = localPart.trim();
  return trimmedLocalPart === "" ? email : trimmedLocalPart;
};
const getGoogleAccountLabel = (account: GoogleAccountDisplay): string => account.email ? getEmailLocalPart(account.email) : account.name ?? "Google";
const isLinkedGoogleCalendar = (accountId: string, calendarId: string, links: ProjectCalendarLink[]): boolean => getLinkedGoogleCalendarLink(accountId, calendarId, links) !== null;
const isGoogleCalendarLinkedToProject = (projectId: string, accountId: string, calendarId: string, links: ProjectCalendarLink[]): boolean => links.some((link) => link.projectId === projectId && link.provider === "google" && link.accountId === accountId && link.externalCalendarId === calendarId);
const resolveCalendarColor = (accountId: string, calendar: GoogleCalendarListItem, overrides: GoogleCalendarColorOverrideMap): string => overrides[createGoogleCalendarColorOverrideKey(accountId, calendar.id)] ?? calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR;
const findMatchingGoogleCalendarsForProject = (project: AppCalendarItem, accounts: GoogleAccountDisplay[], links: ProjectCalendarLink[]): MatchingGoogleCalendarTarget[] => {
  const normalizedProjectName = normalizeProjectCalendarName(project.label);
  if (normalizedProjectName === "") return [];
  return accounts.flatMap((account) => account.calendars.flatMap((calendar): MatchingGoogleCalendarTarget[] => {
    if (normalizeProjectCalendarName(getGoogleCalendarName(calendar)) !== normalizedProjectName) return [];
    if (isGoogleCalendarLinkedToProject(project.id, account.accountId, calendar.id, links)) return [];
    return [{ account, calendar }];
  }));
};
const createGoogleProjectLinkActionLabel = (target: MatchingGoogleCalendarTarget, targetCount: number): string => targetCount <= 1 ? "既存Googleカレンダーにリンク" : `既存Googleカレンダーにリンク: ${getGoogleAccountLabel(target.account)}`;
const createGoogleCalendarActionLabel = (account: GoogleAccountDisplay, accountCount: number): string => accountCount <= 1 ? "Googleカレンダーとして追加" : `Googleカレンダーとして追加: ${getGoogleAccountLabel(account)}`;
const createProjectLinkedGoogleCalendarDotStyle = (color: string): CSSProperties => ({
  backgroundColor: color,
  borderColor: SCHEDULE_SOURCE_COLOR.linkedDotBorder,
  boxShadow: `0 0 0 1px ${SCHEDULE_SOURCE_COLOR.linkedDotRing}`,
});



const IconChevronRight = ({ className }: IconProps) => <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const IconPlus = ({ className }: IconProps) => <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}><path d="M8 3.5V12.5M3.5 8H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
const CalendarSidebarHeading = ({ heading, addLabel, onAdd, disabled = false, headingAriaLabel }: CalendarSidebarHeadingProps) => (
  <div className={CALENDAR_SIDEBAR_HEADING_ROW_CLASS_NAME}>
    <h2 className={CALENDAR_SIDEBAR_HEADING_CLASS_NAME} aria-label={headingAriaLabel}>{heading}</h2>
    <button type="button" className={CALENDAR_SIDEBAR_ADD_BUTTON_CLASS_NAME} onClick={onAdd} disabled={disabled} aria-label={addLabel} title={addLabel}><IconPlus className="h-4 w-4" /></button>
  </div>
);
const ProjectSourceRow = ({ project, onToggleProject }: ProjectSourceRowProps) => <SelectableGoogleSourceRow id={project.id} label={project.label} checked={project.checked} color={project.color} className={CALENDAR_SIDEBAR_ROW_CONTENT_CLASS_NAME} onToggle={onToggleProject} />;
const GoogleCalendarSourceRow = ({ account, calendar, color, onToggleCalendar, onOpenCalendarContextMenu }: GoogleCalendarSourceRowProps) => (
  <div onContextMenu={(event) => onOpenCalendarContextMenu(event, account, calendar)}>
    <SelectableGoogleSourceRow id={calendar.id} label={calendar.summary} checked={account.selectedCalendarIds.has(calendar.id)} color={color} className={CALENDAR_SIDEBAR_ROW_CONTENT_CLASS_NAME} onToggle={onToggleCalendar} />
  </div>
);
const ProjectLinkedGoogleCalendarRow = ({ accountId, calendar, color }: { accountId: string; calendar: GoogleCalendarListItem; color: string; }) => (
  <div className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, CALENDAR_SIDEBAR_ROW_CONTENT_CLASS_NAME, "text-slate-500")} title={getGoogleCalendarName(calendar)} data-calendar-account-id={accountId}>
    <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
      <span className="h-2.5 w-2.5 rounded-full border" style={createProjectLinkedGoogleCalendarDotStyle(color)} />
    </span>
    <span className="truncate text-xs font-medium text-zinc-500">{calendar.summary}</span>
  </div>
);
const ProjectLinkedGoogleCalendarsSection = ({ account, calendars, googleCalendarColorOverrides }: { account: GoogleAccountDisplay; calendars: GoogleCalendarListItem[]; googleCalendarColorOverrides: GoogleCalendarColorOverrideMap; }) => {
  const [isOpen, setIsOpen] = useState(false);
  if (calendars.length === 0) return null;
  return (
    <div className="mt-1">
      <button type="button" className="group flex h-7 w-full items-center gap-1.5 rounded-lg px-1.5 text-left transition-all duration-150 hover:bg-neutral-100 active:bg-neutral-200" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
        <span className={cn("flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-all duration-200 group-hover:bg-white group-hover:text-zinc-500", !isOpen && "-rotate-90")}><IconChevronRight className="h-3 w-3" /></span>
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-zinc-400">{PROJECT_LINKED_GOOGLE_CALENDARS_LABEL}</span>
        <span className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-500">{calendars.length}</span>
      </button>
      {isOpen ? <div className="mt-0.5 flex flex-col gap-0.5 pl-2">{calendars.map((calendar) => <ProjectLinkedGoogleCalendarRow key={calendar.id} accountId={account.accountId} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} />)}</div> : null}
    </div>
  );
};
const AppProjectsSection = ({ projects, isAdding, onAddProject, onToggleProject, onOpenProjectLinksContextMenu, onAddingChange }: AppProjectsSectionProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [projectName, setProjectName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const handleAddProject = () => {
    const trimmedProjectName = projectName.trim();
    if (trimmedProjectName === "") {
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
      {projects.map((project) => <div key={project.id} onContextMenu={(event) => onOpenProjectLinksContextMenu(event, project)}><ProjectSourceRow project={project} onToggleProject={onToggleProject} /></div>)}
      {isAdding ? (
        <div className="ml-2 mt-1 flex flex-col gap-1">
          <form className="flex h-7 items-center gap-1.5" onSubmit={handleSubmit}>
            <input ref={inputRef} value={projectName} onChange={(event) => {
              setProjectName(event.target.value);
              if (addError !== null) setAddError(null);
            }} onKeyDown={handleProjectNameKeyDown} autoFocus placeholder="プロジェクト名" aria-label="プロジェクト名" aria-invalid={Boolean(addError)} aria-describedby={addError ? "app-project-add-error" : undefined} className={cn("min-w-0 flex-1 rounded-full bg-white px-3 py-1 text-xs font-medium text-neutral-700 outline-none transition focus:ring-2", addError ? "border border-red-300 focus:border-red-300 focus:ring-red-50" : "border border-neutral-200 focus:border-neutral-300 focus:ring-neutral-100")}
            />
            <button type="submit" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-slate-500 transition hover:bg-neutral-200 active:scale-95" aria-label="プロジェクトを追加"><IconPlus className="h-3.5 w-3.5" /></button>
          </form>
          {addError ? <p id="app-project-add-error" className="px-3 text-xs font-semibold text-red-500">{addError}</p> : null}
        </div>
      ) : null}
    </div>
  );
};
const GoogleAccountSection = ({ account, projectCalendarLinks, googleCalendarColorOverrides, onToggleCalendar, onOpenCalendarContextMenu, onReconnect }: GoogleAccountSectionProps) => {
  const projectLinkedCalendars = useMemo(() => account.calendars.filter((calendar) => isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);
  const regularCalendars = useMemo(() => account.calendars.filter((calendar) => !isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);
  return (
    <div className="mt-0.5 flex flex-col gap-0.5">
      {regularCalendars.map((calendar) => <GoogleCalendarSourceRow key={calendar.id} account={account} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} onToggleCalendar={onToggleCalendar} onOpenCalendarContextMenu={onOpenCalendarContextMenu} />)}
      <ProjectLinkedGoogleCalendarsSection account={account} calendars={projectLinkedCalendars} googleCalendarColorOverrides={googleCalendarColorOverrides} />
      {account.error ? <div className="px-5 py-1 text-xs text-red-500"><p>Google カレンダーを取得できませんでした。</p><p className="mt-0.5 text-zinc-400">{account.error}</p><button type="button" className="mt-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-slate-500 transition hover:bg-neutral-200 active:scale-95" onClick={onReconnect}>再連携</button></div> : null}
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
      {accounts.length === 0 ? <button type="button" className="ml-2 flex h-7 items-center gap-1.5 rounded-lg px-1.5 text-left text-xs font-semibold text-zinc-500 transition hover:bg-neutral-100 hover:text-slate-600 active:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleAddCalendar} disabled={isConnecting}><GoogleIcon className="size-4 shrink-0 text-neutral-500" label="Google" /><span>{isConnecting ? CONNECTING_GOOGLE_CALENDAR_LABEL : ADD_GOOGLE_CALENDAR_LABEL}</span></button> : accounts.map((account) => <GoogleAccountSection key={account.accountId} account={account} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} onToggleCalendar={(calendarId) => onToggleCalendar(account.accountId, calendarId)} onOpenCalendarContextMenu={onOpenCalendarContextMenu} onReconnect={() => onReconnectAccount(account.accountId)} />)}
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
    setCalendarContextMenu({ accountId: account.accountId, calendarId: calendar.id, color: resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides), x, y });
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
    if (colorPickerTarget === null) return;
    onChangeGoogleCalendarColor(colorPickerTarget.accountId, colorPickerTarget.calendarId, event.target.value);
  }, [colorPickerTarget, onChangeGoogleCalendarColor]);
  const calendarMenuActions = useMemo<CalendarListMenuAction[]>(() => {
    if (calendarContextMenu === null) return [];
    return [
      {
        id: "add-project",
        label: "プロジェクトに追加",
        onSelect: () => {
          onLinkGoogleCalendarAsProject(calendarContextMenu.accountId, calendarContextMenu.calendarId);
          setCalendarContextMenu(null);
        },
      },
      {
        id: "change-color",
        label: "色を変更",
        onSelect: () => {
          setColorPickerTarget({ accountId: calendarContextMenu.accountId, calendarId: calendarContextMenu.calendarId });
          window.setTimeout(() => {
            const colorInput = colorInputRef.current;
            if (colorInput === null) return;
            colorInput.value = calendarContextMenu.color;
            colorInput.click();
          }, 0);
          setCalendarContextMenu(null);
        },
      },
    ];
  }, [calendarContextMenu, onLinkGoogleCalendarAsProject]);
  const projectLinksMenuActions = useMemo<ProjectCalendarLinksMenuAction[]>(() => {
    if (projectLinksContextMenu === null) return [];
    const createActions: ProjectCalendarLinksMenuAction[] = googleAccounts.length === 0 ? [
      {
        id: "no-google-account",
        label: "Googleアカウントがありません",
        disabled: true,
        onSelect: () => undefined,
      },
    ] : googleAccounts.map((account) => ({
      id: `create-google-${account.accountId}`,
      label: createGoogleCalendarActionLabel(account, googleAccounts.length),
      disabled: account.connectionStatus !== "connected",
      onSelect: () => {
        onCreateProjectGoogleCalendar(projectLinksContextMenu.project.id, account.accountId);
        setProjectLinksContextMenu(null);
      },
    }));
    const linkActions: ProjectCalendarLinksMenuAction[] = projectLinksContextMenu.matchingGoogleCalendars.map((target) => ({
      id: `link-google-${target.account.accountId}-${target.calendar.id}`,
      label: createGoogleProjectLinkActionLabel(target, projectLinksContextMenu.matchingGoogleCalendars.length),
      onSelect: () => {
        onLinkProjectToGoogleCalendar(projectLinksContextMenu.project.id, target.account.accountId, target.calendar.id);
        setProjectLinksContextMenu(null);
      },
    }));
    const unlinkActions: ProjectCalendarLinksMenuAction[] = projectLinksContextMenu.links.map((link) => ({
      id: `unlink-${link.id}`,
      label: `${getProjectLinkProviderLabel(link)}連携を解除`,
      onSelect: () => {
        onUnlinkProjectCalendar(link.id);
        setProjectLinksContextMenu(null);
      },
    }));
    return [...createActions, ...linkActions, ...unlinkActions];
  }, [googleAccounts, onCreateProjectGoogleCalendar, onLinkProjectToGoogleCalendar, onUnlinkProjectCalendar, projectLinksContextMenu]);
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden pb-0 text-neutral-700", className)}>
      <nav className="flex min-h-0 w-full flex-1 flex-col overflow-hidden pb-0" aria-label="カレンダー一覧">
        <CalendarSidebarHeading heading={t.myProjects} addLabel={ADD_PROJECT_LABEL} onAdd={handleStartAddingProject} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className={CALENDAR_SIDEBAR_PROJECT_LIST_CLASS_NAME}><AppProjectsSection projects={appProjects} isAdding={isAddingProject} onAddProject={onAddProject} onToggleProject={onToggleProject} onOpenProjectLinksContextMenu={handleOpenProjectLinksContextMenu} onAddingChange={setIsAddingProject} /></div>
          <div className="shrink-0 pt-2"><CalendarSidebarHeading heading={GOOGLE_CALENDAR_SECTION_LABEL} addLabel={ADD_GOOGLE_CALENDAR_LABEL} onAdd={handleAddGoogleCalendar} disabled={isAnyCalendarConnecting} headingAriaLabel={GOOGLE_CALENDAR_SECTION_LABEL} /></div>
          <div className={CALENDAR_SIDEBAR_GOOGLE_LIST_CLASS_NAME}><GoogleAccountsSection accounts={googleAccounts} isConnecting={isAnyCalendarConnecting} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} onAddCalendar={handleAddGoogleCalendar} onToggleCalendar={onToggleCalendar} onOpenCalendarContextMenu={handleOpenCalendarContextMenu} onReconnectAccount={onReconnectAccount} /></div>
        </div>
      </nav>
      <input ref={colorInputRef} type="color" aria-label="カレンダー色" className={CALENDAR_SIDEBAR_COLOR_INPUT_CLASS_NAME} onChange={handleChangeCalendarColor} />
      {calendarContextMenu ? createPortal(<CalendarListMenu x={calendarContextMenu.x} y={calendarContextMenu.y} actions={calendarMenuActions} menuRef={calendarContextMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} />, document.body) : null}
      {projectLinksContextMenu ? createPortal(<ProjectCalendarLinksMenu x={projectLinksContextMenu.x} y={projectLinksContextMenu.y} actions={projectLinksMenuActions} menuRef={projectLinksContextMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} />, document.body) : null}
    </div>
  );
};
const CalendarSidebar = (props: CalendarSidebarProps) => <SidebarLayeredDirectory calendarContent={<CalendarSidebarContent {...props} className={CALENDAR_SIDEBAR_CONTENT_CLASS_NAME} />} />;



export { CalendarSidebar, CalendarSidebarContent };
