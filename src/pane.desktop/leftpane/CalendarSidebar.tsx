import { type ChangeEvent, type CSSProperties, type FormEvent, type KeyboardEvent, type MouseEvent as ReactMouseEvent, useCallback, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarIcon, GoogleIcon } from "@/chip/icons/icons.schedule";
import { CALENDAR_LIST_MENU_HEIGHT, CALENDAR_LIST_MENU_WIDTH, CALENDAR_LIST_MENU_PANEL_ID, CalendarListMenu, type CalendarListMenuAction } from "@/chip/rightclickpanel.desktop/CalendarListMenu.desktop";
import { RIGHT_CLICK_PANEL_NO_DRAG_STYLE, clampRightClickPanelPosition, useRightClickPanelDismiss } from "@/chip/rightclickpanel.desktop/rightClickPanel.utils";
import { MiniCalendarSection } from "@/features/calendar/panel/MiniCalendarSection";
import { GOOGLE_SOURCE_ROW_CLASS_NAME, SelectableGoogleSourceRow } from "@/features/calendar/panel/SelectableGoogleSourceRow";
import type { AppCalendarItem, CalendarSidebarProps, GoogleAccountDisplay, GoogleCalendarColorOverrideMap, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { SidebarLayeredDirectory } from "./Sidebar.LayeredDirectory";

type CalendarContextMenuState = {
  accountId: string;
  calendarId: string;
  calendarName: string;
  color: string;
  x: number;
  y: number;
};

type CalendarColorPickerTarget = {
  accountId: string;
  calendarId: string;
};

type CalendarContextMenuTriggerEvent = ReactMouseEvent<HTMLElement>;

type AppProjectsSectionProps = {
  projects: AppCalendarItem[];
  projectCalendarLinks: ProjectCalendarLink[];
  isAdding: boolean;
  onAddProject: (projectName: string) => void;
  onToggleProject: (projectId: string) => void;
  onUnlinkProjectCalendar: (linkId: string) => void;
  onAddingChange: (isAdding: boolean) => void;
};

type ProjectLinkBadgesProps = {
  links: ProjectCalendarLink[];
  onUnlinkProjectCalendar: (linkId: string) => void;
};

type GoogleCalendarSourceRowProps = {
  account: GoogleAccountDisplay;
  calendar: GoogleCalendarListItem;
  color: string;
  onToggleCalendar: (calendarId: string) => void;
  onOpenCalendarContextMenu: (event: CalendarContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void;
};

type ProjectLinkedGoogleCalendarRowProps = {
  calendar: GoogleCalendarListItem;
  color: string;
};

type ProjectLinkedGoogleCalendarsSectionProps = {
  account: GoogleAccountDisplay;
  calendars: GoogleCalendarListItem[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
};

type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  projectCalendarLinks: ProjectCalendarLink[];
  googleCalendarColorOverrides: GoogleCalendarColorOverrideMap;
  onToggleCalendar: (calendarId: string) => void;
  onOpenCalendarContextMenu: (event: CalendarContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => void;
  onReconnect: () => void;
};

const DEFAULT_CALENDAR_COLOR = "#74798b";
const ADD_PROJECT_EMPTY_MESSAGE = "プロジェクト名を入力してください";
const PROJECT_LINKED_GOOGLE_CALENDARS_LABEL = "プロジェクトに追加したカレンダー";
const CALENDAR_CONTEXT_MENU_DIMENSIONS = {
  width: CALENDAR_LIST_MENU_WIDTH,
  height: CALENDAR_LIST_MENU_HEIGHT,
};
const COLOR_INPUT_STYLE: CSSProperties = {
  position: "fixed",
  left: -9999,
  top: -9999,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
};

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

const createGoogleCalendarColorOverrideKey = (accountId: string, calendarId: string): string => `${accountId}:${calendarId}`;

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

const isLinkedGoogleCalendar = (accountId: string, calendarId: string, links: ProjectCalendarLink[]): boolean => getLinkedGoogleCalendarLink(accountId, calendarId, links) !== null;

const resolveCalendarColor = (accountId: string, calendar: GoogleCalendarListItem, overrides: GoogleCalendarColorOverrideMap): string => overrides[createGoogleCalendarColorOverrideKey(accountId, calendar.id)] ?? calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR;

const ProjectLinkBadges = ({ links, onUnlinkProjectCalendar }: ProjectLinkBadgesProps) => {
  if (links.length === 0) return null;

  return (
    <div className="ml-8 mt-0.5 flex flex-wrap gap-1 pr-2">
      {links.map((link) => (
        <span key={link.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[10px] font-semibold text-[#6d7380]" title={`${getProjectLinkProviderLabel(link)}: ${link.externalCalendarName}`}>
          <span className="truncate">{getProjectLinkProviderLabel(link)}</span>
          <button
            type="button"
            className="rounded-full px-0.5 text-[#a0a5af] transition hover:bg-white hover:text-[#6d7380]"
            onClick={(event) => {
              event.stopPropagation();
              onUnlinkProjectCalendar(link.id);
            }}
            aria-label={`${link.externalCalendarName} の同期リンクを解除`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
};

const GoogleCalendarSourceRow = ({ account, calendar, color, onToggleCalendar, onOpenCalendarContextMenu }: GoogleCalendarSourceRowProps) => {
  return (
    <div onContextMenu={(event) => onOpenCalendarContextMenu(event, account, calendar)}>
      <SelectableGoogleSourceRow id={calendar.id} label={calendar.summary} checked={account.selectedCalendarIds.has(calendar.id)} color={color} onToggle={onToggleCalendar} />
    </div>
  );
};

const ProjectLinkedGoogleCalendarRow = ({ calendar, color }: ProjectLinkedGoogleCalendarRowProps) => {
  return (
    <div className={cn(GOOGLE_SOURCE_ROW_CLASS_NAME, "text-[#6d7380]")} title={calendar.summaryOverride ?? calendar.summary}>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full border border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]" style={{ backgroundColor: color }} />
      </span>
      <span className="truncate text-[12px] font-medium text-[#8c9099]">{calendar.summary}</span>
    </div>
  );
};

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

      {isOpen && (
        <div className="mt-0.5 flex flex-col gap-0.5 pl-2">
          {calendars.map((calendar) => (
            <ProjectLinkedGoogleCalendarRow key={calendar.id} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} />
          ))}
        </div>
      )}
    </div>
  );
};

const AppProjectsSection = ({ projects, projectCalendarLinks, isAdding, onAddProject, onToggleProject, onUnlinkProjectCalendar, onAddingChange }: AppProjectsSectionProps) => {
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
        <div key={project.id}>
          <SelectableGoogleSourceRow id={project.id} label={project.label} checked={project.checked} color={project.color} onToggle={onToggleProject} />
          <ProjectLinkBadges links={getProjectLinks(project.id, projectCalendarLinks)} onUnlinkProjectCalendar={onUnlinkProjectCalendar} />
        </div>
      ))}

      {isAdding && (
        <div className="mx-2 ml-2 mt-1 flex flex-col gap-1">
          <form className="flex h-7 items-center gap-1.5" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={projectName}
              onChange={(event) => {
                setProjectName(event.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={handleProjectNameKeyDown}
              autoFocus
              placeholder="プロジェクト名"
              aria-label="プロジェクト名"
              aria-invalid={Boolean(addError)}
              aria-describedby={addError ? "app-project-add-error" : undefined}
              className={cn("min-w-0 flex-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#2f2f2f] outline-none transition focus:ring-2", addError ? "border border-[#e08b8b] focus:border-[#e08b8b] focus:ring-[#f9e8e8]" : "border border-[#e6e6e6] focus:border-[#d7d7d7] focus:ring-[#f2f2f2]")}
            />
            <button type="submit" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#6d7380] transition hover:bg-[#ececec] active:scale-[0.94]" aria-label="プロジェクトを追加">
              <IconPlus className="h-3.5 w-3.5" />
            </button>
          </form>
          {addError && (
            <p id="app-project-add-error" className="px-3 text-[10px] font-semibold text-[#c25f5f]">
              {addError}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const GoogleAccountSection = ({ account, projectCalendarLinks, googleCalendarColorOverrides, onToggleCalendar, onOpenCalendarContextMenu, onReconnect }: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = account.name ?? account.email ?? "Google";
  const projectLinkedCalendars = useMemo(() => account.calendars.filter((calendar) => isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);
  const regularCalendars = useMemo(() => account.calendars.filter((calendar) => !isLinkedGoogleCalendar(account.accountId, calendar.id, projectCalendarLinks)), [account.accountId, account.calendars, projectCalendarLinks]);

  return (
    <div className="mt-2">
      <button type="button" className="group flex h-7 w-full items-center gap-1.5 rounded-[10px] px-1.5 text-left transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen}>
        <GoogleIcon className="size-[16px] shrink-0 text-[#5f6368]" label={accountName} />

        {account.email && <span className="truncate text-[11px] font-semibold tracking-wider text-[#9a9a9a]">{account.email}</span>}

        <span className={cn("ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all duration-200 group-hover:bg-white group-hover:text-[#8c8c8c]", !isOpen && "-rotate-90")}>
          <IconChevronRight className="h-3 w-3" />
        </span>
      </button>

      {isOpen && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {regularCalendars.map((calendar) => (
            <GoogleCalendarSourceRow key={calendar.id} account={account} calendar={calendar} color={resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides)} onToggleCalendar={onToggleCalendar} onOpenCalendarContextMenu={onOpenCalendarContextMenu} />
          ))}

          <ProjectLinkedGoogleCalendarsSection account={account} calendars={projectLinkedCalendars} googleCalendarColorOverrides={googleCalendarColorOverrides} />

          {account.error && (
            <div className="px-5 py-1 text-[11px] text-[#c25f5f]">
              <p>Google カレンダーを取得できませんでした。</p>
              <p className="mt-0.5 text-[#9a9a9a]">{account.error}</p>
              <button type="button" className="mt-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] font-semibold text-[#5f6574] transition hover:bg-[#ececec] active:scale-[0.97]" onClick={onReconnect}>
                再連携
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CalendarSidebar = ({ monthDate, selectedDate, visibleEvents, appProjects, projectCalendarLinks, googleCalendarColorOverrides, googleAccounts, onSelectDate, onPreviousMonth, onNextMonth, onAddProject, onToggleProject, onLinkGoogleCalendarAsProject, onUnlinkProjectCalendar, onChangeGoogleCalendarColor, onReconnectAccount, onToggleCalendar }: CalendarSidebarProps) => {
  const t = useT();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeTab = useMemo(() => tabs.find((tab) => tab.id === activeTabId) ?? null, [activeTabId, tabs]);
  const isLibrarySidebarActive = activeTab?.sectionKey === "library";
  const selectDateRef = useRef(onSelectDate);
  const previousMonthRef = useRef(onPreviousMonth);
  const nextMonthRef = useRef(onNextMonth);
  const calendarContextMenuRef = useRef<HTMLDivElement | null>(null);
  const colorInputRef = useRef<HTMLInputElement | null>(null);
  const [isAddingProject, setIsAddingProject] = useState(false);
  const [calendarContextMenu, setCalendarContextMenu] = useState<CalendarContextMenuState | null>(null);
  const [colorPickerTarget, setColorPickerTarget] = useState<CalendarColorPickerTarget | null>(null);

  selectDateRef.current = onSelectDate;
  previousMonthRef.current = onPreviousMonth;
  nextMonthRef.current = onNextMonth;

  useRightClickPanelDismiss(CALENDAR_LIST_MENU_PANEL_ID, calendarContextMenu !== null, calendarContextMenuRef, () => setCalendarContextMenu(null));

  const handleMiniCalendarSelectDate = useCallback((date: Date) => {
    selectDateRef.current(date);
  }, []);

  const handleMiniCalendarPreviousMonth = useCallback(() => {
    previousMonthRef.current();
  }, []);

  const handleMiniCalendarNextMonth = useCallback(() => {
    nextMonthRef.current();
  }, []);

  const handleStartAddingProject = useCallback(() => {
    setIsAddingProject(true);
  }, []);

  const handleOpenCalendarContextMenu = useCallback((event: CalendarContextMenuTriggerEvent, account: GoogleAccountDisplay, calendar: GoogleCalendarListItem) => {
    event.preventDefault();
    event.stopPropagation();

    const { x, y } = clampRightClickPanelPosition(event.clientX, event.clientY, CALENDAR_CONTEXT_MENU_DIMENSIONS);
    setCalendarContextMenu({
      accountId: account.accountId,
      calendarId: calendar.id,
      calendarName: calendar.summaryOverride ?? calendar.summary,
      color: resolveCalendarColor(account.accountId, calendar, googleCalendarColorOverrides),
      x,
      y,
    });
  }, [googleCalendarColorOverrides]);

  const handleChangeCalendarColor = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (!colorPickerTarget) return;

    onChangeGoogleCalendarColor(colorPickerTarget.accountId, colorPickerTarget.calendarId, event.target.value);
  }, [colorPickerTarget, onChangeGoogleCalendarColor]);

  const calendarMenuActions = useMemo<CalendarListMenuAction[]>(() => {
    if (!calendarContextMenu) return [];

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
            if (!colorInputRef.current) return;

            colorInputRef.current.value = calendarContextMenu.color;
            colorInputRef.current.click();
          }, 0);

          setCalendarContextMenu(null);
        },
      },
    ];
  }, [calendarContextMenu, onLinkGoogleCalendarAsProject]);

  const calendarContextMenuElement = calendarContextMenu ? (
    <CalendarListMenu x={calendarContextMenu.x} y={calendarContextMenu.y} actions={calendarMenuActions} menuRef={calendarContextMenuRef} noDragStyle={RIGHT_CLICK_PANEL_NO_DRAG_STYLE} />
  ) : null;

  if (isLibrarySidebarActive) {
    return <SidebarLayeredDirectory />;
  }

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent pb-0 pl-0 pr-3 pt-2 text-[#2f2f2f]">
      <MiniCalendarSection monthDate={monthDate} selectedDate={selectedDate} visibleEvents={visibleEvents} onSelectDate={handleMiniCalendarSelectDate} onPreviousMonth={handleMiniCalendarPreviousMonth} onNextMonth={handleMiniCalendarNextMonth} />

      <nav className="mt-2 flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto pb-0">
        <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 text-[#9a9a9a]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#9a9a9a]">{t.myProjects}</span>
          <button type="button" className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#8c8c8c] transition hover:bg-[#ececec] hover:text-[#5f6574] active:scale-[0.94]" onClick={handleStartAddingProject} aria-label="プロジェクトを追加">
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        <AppProjectsSection projects={appProjects} projectCalendarLinks={projectCalendarLinks} isAdding={isAddingProject} onAddProject={onAddProject} onToggleProject={onToggleProject} onUnlinkProjectCalendar={onUnlinkProjectCalendar} onAddingChange={setIsAddingProject} />

        {googleAccounts.map((account) => (
          <GoogleAccountSection key={account.accountId} account={account} projectCalendarLinks={projectCalendarLinks} googleCalendarColorOverrides={googleCalendarColorOverrides} onToggleCalendar={(calendarId) => onToggleCalendar(account.accountId, calendarId)} onOpenCalendarContextMenu={handleOpenCalendarContextMenu} onReconnect={() => onReconnectAccount(account.accountId)} />
        ))}
      </nav>

      <input ref={colorInputRef} type="color" aria-label="カレンダー色" style={COLOR_INPUT_STYLE} onChange={handleChangeCalendarColor} />

      {calendarContextMenuElement ? createPortal(calendarContextMenuElement, document.body) : null}
    </aside>
  );
};
