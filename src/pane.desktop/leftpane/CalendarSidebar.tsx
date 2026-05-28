import { type FormEvent, type KeyboardEvent, useCallback, useMemo, useRef, useState } from "react";
import { CalendarIcon, GoogleIcon } from "@/chip/icons/icons.schedule";
import { MiniCalendarSection } from "@/features/calendar/panel/MiniCalendarSection";
import { SelectableGoogleSourceRow } from "@/features/calendar/panel/SelectableGoogleSourceRow";
import type { AppCalendarItem, CalendarSidebarProps, GoogleAccountDisplay, ProjectCalendarLink } from "@/features/calendar/scheduleScreen.types";
import type { GoogleCalendarListItem } from "@/integration/googlecalendar-integration/gcalSync.types";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";
import { SidebarLayeredDirectory } from "./Sidebar.LayeredDirectory";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";

const DEFAULT_CALENDAR_COLOR = "#74798b";
const ADD_PROJECT_EMPTY_MESSAGE = "プロジェクト名を入力してください";

const IconChevronRight = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M6 4L10 8L6 12"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconPlus = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M8 3.5V12.5M3.5 8H12.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

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

type GoogleCalendarProjectActionProps = {
  accountId: string;
  calendar: GoogleCalendarListItem;
  projectCalendarLinks: ProjectCalendarLink[];
  onLinkGoogleCalendarAsProject: (accountId: string, calendarId: string) => void;
};

type GoogleAccountSectionProps = {
  account: GoogleAccountDisplay;
  projectCalendarLinks: ProjectCalendarLink[];
  onToggleCalendar: (calendarId: string) => void;
  onLinkGoogleCalendarAsProject: (accountId: string, calendarId: string) => void;
  onReconnect: () => void;
};

const getProjectLinks = (projectId: string, links: ProjectCalendarLink[]): ProjectCalendarLink[] => links.filter((link) => link.projectId === projectId);

const getLinkedGoogleCalendarLink = (accountId: string, calendarId: string, links: ProjectCalendarLink[]): ProjectCalendarLink | null => links.find(
  (link) =>
    link.provider === "google" &&
    link.accountId === accountId &&
    link.externalCalendarId === calendarId,
) ?? null;

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

const ProjectLinkBadges = ({
  links,
  onUnlinkProjectCalendar,
}: ProjectLinkBadgesProps) => {
  if (links.length === 0) return null;

  return (
    <div className="ml-8 mt-0.5 flex flex-wrap gap-1 pr-2">
      {links.map((link) => (
        <span
          key={link.id}
          className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#f3f5f8] px-2 py-0.5 text-[10px] font-semibold text-[#6d7380]"
          title={`${getProjectLinkProviderLabel(link)}: ${link.externalCalendarName}`}
        >
          <span className="truncate">
            {getProjectLinkProviderLabel(link)}
          </span>
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

const GoogleCalendarProjectAction = ({
  accountId,
  calendar,
  projectCalendarLinks,
  onLinkGoogleCalendarAsProject,
}: GoogleCalendarProjectActionProps) => {
  const linkedProject = getLinkedGoogleCalendarLink(accountId, calendar.id, projectCalendarLinks);

  if (linkedProject) {
    return (
      <span className="mr-1 shrink-0 rounded-full bg-[#eef6ef] px-2 py-0.5 text-[10px] font-bold text-[#5f8f63]">
        Project
      </span>
    );
  }

  return (
    <button
      type="button"
      className="mr-1 shrink-0 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[10px] font-bold text-[#8c8c8c] transition hover:bg-[#ececec] hover:text-[#5f6574] active:scale-[0.97]"
      onClick={() => onLinkGoogleCalendarAsProject(accountId, calendar.id)}
      aria-label={`${calendar.summaryOverride ?? calendar.summary} をプロジェクトとして使用`}
    >
      Use
    </button>
  );
};

const AppProjectsSection = ({
  projects,
  projectCalendarLinks,
  isAdding,
  onAddProject,
  onToggleProject,
  onUnlinkProjectCalendar,
  onAddingChange,
}: AppProjectsSectionProps) => {
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
          <SelectableGoogleSourceRow
            id={project.id}
            label={project.label}
            checked={project.checked}
            color={project.color}
            onToggle={onToggleProject}
          />
          <ProjectLinkBadges
            links={getProjectLinks(project.id, projectCalendarLinks)}
            onUnlinkProjectCalendar={onUnlinkProjectCalendar}
          />
        </div>
      ))}

      {isAdding && (
        <div className="mx-2 ml-2 mt-1 flex flex-col gap-1">
          <form
            className="flex h-7 items-center gap-1.5"
            onSubmit={handleSubmit}
          >
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
              className={cn(
                "min-w-0 flex-1 rounded-full bg-white px-3 py-1 text-[12px] font-medium text-[#2f2f2f] outline-none transition focus:ring-2",
                addError
                  ? "border border-[#e08b8b] focus:border-[#e08b8b] focus:ring-[#f9e8e8]"
                  : "border border-[#e6e6e6] focus:border-[#d7d7d7] focus:ring-[#f2f2f2]",
              )}
            />
            <button
              type="submit"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#6d7380] transition hover:bg-[#ececec] active:scale-[0.94]"
              aria-label="プロジェクトを追加"
            >
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

const GoogleAccountSection = ({
  account,
  projectCalendarLinks,
  onToggleCalendar,
  onLinkGoogleCalendarAsProject,
  onReconnect,
}: GoogleAccountSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const accountName = account.name ?? account.email ?? "Google";

  return (
    <div className="mt-2">
      <button
        type="button"
        className="group flex h-7 w-full items-center gap-1.5 rounded-[10px] px-1.5 text-left transition-all duration-150 hover:bg-[#f7f7f7] active:bg-[#f1f1f1]"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <GoogleIcon className="size-[16px] shrink-0 text-[#5f6368]" label={accountName} />

        {account.email && (
          <span className="truncate text-[11px] font-semibold tracking-wider text-[#9a9a9a]">
            {account.email}
          </span>
        )}

        <span
          className={cn(
            "ml-auto flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[#b3b3b3] transition-all duration-200 group-hover:bg-white group-hover:text-[#8c8c8c]",
            !isOpen && "-rotate-90",
          )}
        >
          <IconChevronRight className="h-3 w-3" />
        </span>
      </button>

      {isOpen && (
        <div className="mt-0.5 flex flex-col gap-0.5">
          {account.calendars.map((calendar) => (
            <div key={calendar.id} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <SelectableGoogleSourceRow
                  id={calendar.id}
                  label={calendar.summary}
                  checked={account.selectedCalendarIds.has(calendar.id)}
                  color={calendar.backgroundColor ?? DEFAULT_CALENDAR_COLOR}
                  onToggle={onToggleCalendar}
                />
              </div>
              <GoogleCalendarProjectAction
                accountId={account.accountId}
                calendar={calendar}
                projectCalendarLinks={projectCalendarLinks}
                onLinkGoogleCalendarAsProject={onLinkGoogleCalendarAsProject}
              />
            </div>
          ))}

          {account.error && (
            <div className="px-5 py-1 text-[11px] text-[#c25f5f]">
              <p>Google カレンダーを取得できませんでした。</p>
              <p className="mt-0.5 text-[#9a9a9a]">{account.error}</p>
              <button
                type="button"
                className="mt-1 rounded-full bg-[#f4f4f4] px-2 py-0.5 text-[11px] font-semibold text-[#5f6574] transition hover:bg-[#ececec] active:scale-[0.97]"
                onClick={onReconnect}
              >
                再連携
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const CalendarSidebar = ({
  monthDate,
  selectedDate,
  visibleEvents,
  appProjects,
  projectCalendarLinks,
  googleAccounts,
  onSelectDate,
  onPreviousMonth,
  onNextMonth,
  onAddProject,
  onToggleProject,
  onLinkGoogleCalendarAsProject,
  onUnlinkProjectCalendar,
  onReconnectAccount,
  onToggleCalendar,
}: CalendarSidebarProps) => {
  const t = useT();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId) ?? null,
    [activeTabId, tabs],
  );
  const isLibrarySidebarActive = activeTab?.sectionKey === "library";
  const selectDateRef = useRef(onSelectDate);
  const previousMonthRef = useRef(onPreviousMonth);
  const nextMonthRef = useRef(onNextMonth);
  const [isAddingProject, setIsAddingProject] = useState(false);

  selectDateRef.current = onSelectDate;
  previousMonthRef.current = onPreviousMonth;
  nextMonthRef.current = onNextMonth;

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

  if (isLibrarySidebarActive) {
    return <SidebarLayeredDirectory />;
  }

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col overflow-hidden bg-transparent pb-0 pl-0 pr-3 pt-2 text-[#2f2f2f]">
      <MiniCalendarSection
        monthDate={monthDate}
        selectedDate={selectedDate}
        visibleEvents={visibleEvents}
        onSelectDate={handleMiniCalendarSelectDate}
        onPreviousMonth={handleMiniCalendarPreviousMonth}
        onNextMonth={handleMiniCalendarNextMonth}
      />

      <nav className="mt-2 flex min-h-0 w-full flex-1 flex-col gap-0.5 overflow-y-auto pb-0">
        <div className="mb-1 flex h-6 shrink-0 items-center gap-1.5 px-2">
          <CalendarIcon className="h-3.5 w-3.5 text-[#9a9a9a]" />
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#9a9a9a]">
            {t.myProjects}
          </span>
          <button
            type="button"
            className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] text-[#8c8c8c] transition hover:bg-[#ececec] hover:text-[#5f6574] active:scale-[0.94]"
            onClick={handleStartAddingProject}
            aria-label="プロジェクトを追加"
          >
            <IconPlus className="h-3.5 w-3.5" />
          </button>
        </div>

        <AppProjectsSection
          projects={appProjects}
          projectCalendarLinks={projectCalendarLinks}
          isAdding={isAddingProject}
          onAddProject={onAddProject}
          onToggleProject={onToggleProject}
          onUnlinkProjectCalendar={onUnlinkProjectCalendar}
          onAddingChange={setIsAddingProject}
        />

        {googleAccounts.map((account) => (
          <GoogleAccountSection
            key={account.accountId}
            account={account}
            projectCalendarLinks={projectCalendarLinks}
            onToggleCalendar={(calendarId) =>
              onToggleCalendar(account.accountId, calendarId)
            }
            onLinkGoogleCalendarAsProject={onLinkGoogleCalendarAsProject}
            onReconnect={() => onReconnectAccount(account.accountId)}
          />
        ))}
      </nav>
    </aside>
  );
};
