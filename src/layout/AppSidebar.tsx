import {
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useExplorerCalendarViewStore } from "@/features/calendar/store/useExplorerCalendarViewStore";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";
import { cn } from "@/lib/utils";

type AppSidebarNavItem = {
  id: string;
  label: string;
  to?: string;
  icon: ReactNode;
  exactPath?: boolean;
  sectionKey?: "home" | "review" | "library" | "calendar" | "tasks";
  onClick?: () => void;
  disabled?: boolean;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type AppSidebarProps = {
  collapsed?: boolean;
  onOpenSettings?: () => void;
};

type SidebarIconProps = {
  className?: string;
};

const IconShell = ({
  children,
  className,
}: SidebarIconProps & { children: ReactNode }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    {children}
  </svg>
);

const HomeIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M20 8.5V13.5C20 17.271 20 19.157 18.828 20.328C17.656 21.499 15.771 21.5 12 21.5C8.229 21.5 6.343 21.5 5.172 20.328C4.001 19.156 4 17.271 4 13.5V8.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M22 10.5L17.657 6.335C14.99 3.778 13.657 2.5 12 2.5C10.343 2.5 9.01 3.778 6.343 6.335L2 10.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconShell>
);

const InboxIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M5 7h14l1.5 10H15l-1.3 2h-3.4L9 17H3.5L5 7Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </IconShell>
);

const CalendarIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M18 2V4M6 2V4M10 17V13.347C10 13.156 9.863 13 9.695 13H9M13.63 17L14.984 13.35C15.047 13.179 14.913 13 14.721 13H13"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 8H18M2.5 12.243C2.5 7.886 2.5 5.707 3.752 4.353C5.004 3 7.02 3 11.05 3H12.95C16.98 3 18.996 3 20.248 4.354C21.5 5.707 21.5 7.886 21.5 12.244V12.757C21.5 17.114 21.5 19.293 20.248 20.647C18.996 22 16.98 22 12.95 22H11.05C7.02 22 5.004 22 3.752 20.646C2.5 19.293 2.5 17.114 2.5 12.756V12.243Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </IconShell>
);

const TaskIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M7.2 7.5H16.8M7.2 12H16.8M7.2 16.5H13.6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.9"
    />
    <path
      d="M3.8 7.5 4.55 8.25 6.2 6.45M3.8 12 4.55 12.75 6.2 10.95M3.8 16.5 4.55 17.25 6.2 15.45"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </IconShell>
);

const LibraryIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path
      d="M3.75 3C3.28587 3 2.84075 3.18437 2.51256 3.51256C2.18437 3.84075 2 4.28587 2 4.75V8.01C2.52239 7.67577 3.12984 7.49875 3.75 7.5H16.25C16.894 7.5 17.495 7.688 18 8.01V6.75C18 6.28587 17.8156 5.84075 17.4874 5.51256C17.1592 5.18437 16.7141 5 16.25 5H11.414C11.3811 5.00006 11.3486 4.99364 11.3182 4.98112C11.2879 4.96859 11.2603 4.9502 11.237 4.927L9.823 3.513C9.49499 3.18476 9.05004 3.00023 8.586 3H3.75ZM3.75 9C3.28587 9 2.84075 9.18437 2.51256 9.51256C2.18437 9.84075 2 10.2859 2 10.75V15.25C2 16.216 2.784 17 3.75 17H16.25C16.7141 17 17.1592 16.8156 17.4874 16.4874C17.8156 16.1592 18 15.7141 18 15.25V10.75C18 10.2859 17.8156 9.84075 17.4874 9.51256C17.1592 9.18437 16.7141 9 16.25 9H3.75Z"
      fill="currentColor"
    />
  </svg>
);

const ExploreIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M4 6.5 9.5 4l5 2.5L20 4v13.5L14.5 20l-5-2.5L4 20V6.5Z"
      fill="currentColor"
      opacity="0.9"
    />
  </IconShell>
);

const GearIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M12 8.5A3.5 3.5 0 1 1 12 15.5 3.5 3.5 0 0 1 12 8.5Zm7.5 3.5c0-.5-.1-1-.2-1.5l2-1.5-2-3.4-2.4 1a8.7 8.7 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8.7 8.7 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a7.1 7.1 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8.7 8.7 0 0 0 2.6 1.5L10 21.5h4l.4-2.6a8.7 8.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.5Z"
      fill="currentColor"
    />
  </IconShell>
);

const CloudIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="M7.5 17.5h9.3a3.2 3.2 0 0 0 .3-6.4A5.4 5.4 0 0 0 6.8 9.8 3.9 3.9 0 0 0 7.5 17.5Z"
      fill="currentColor"
      opacity="0.45"
    />
    <path
      d="M12 9.5v5M9.8 11.7 12 9.5l2.2 2.2"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </IconShell>
);

const ChevronDownIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path
      d="m8 10 4 4 4-4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </IconShell>
);

const mainNavItems: AppSidebarNavItem[] = [
  {
    id: "home",
    label: "ホーム",
    to: "/folders?home=1",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    sectionKey: "home",
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "review",
    label: "復習",
    to: "/gallery",
    icon: <InboxIcon className="app-sidebar__nav-icon" />,
    sectionKey: "review",
    exactPath: true,
  },
  {
    id: "library",
    label: "ライブラリ",
    to: "/folders?view=section-list",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") !== "1",
  },
  {
    id: "calendar",
    label: "カレンダー",
    to: "/calendar",
    icon: <CalendarIcon className="app-sidebar__nav-icon" />,
    sectionKey: "calendar",
    exactPath: true,
  },
  {
    id: "tasks",
    label: "タスク",
    to: "/tasks",
    icon: <TaskIcon className="app-sidebar__nav-icon" />,
    sectionKey: "tasks",
    exactPath: true,
  },
  {
    id: "explore",
    label: "探す",
    icon: <ExploreIcon className="app-sidebar__nav-icon" />,
  },
];

const libraryChildItems = [
  { label: "PDF", value: "pdf" },
  { label: "フラッシュカード", value: "flashcards" },
  { label: "ノート", value: "notes" },
];

const isNavItemActiveByLocation = (
  item: AppSidebarNavItem,
  pathname: string,
  search: string,
) => {
  const normalizedPathname = pathname.toLowerCase();
  const searchParams = new URLSearchParams(search);

  if (item.match) {
    return item.match(normalizedPathname, searchParams);
  }

  if (!item.to) {
    return false;
  }

  const targetPath = item.to.split("?")[0]?.toLowerCase() ?? item.to;

  if (item.exactPath) {
    return normalizedPathname === targetPath;
  }

  return (
    normalizedPathname === targetPath ||
    normalizedPathname.startsWith(`${targetPath}/`)
  );
};

const AppSidebarNavLink = ({
  item,
  nested = false,
  trailing,
  ariaExpanded,
  disabled,
  compact,
}: {
  item: AppSidebarNavItem;
  nested?: boolean;
  trailing?: ReactNode;
  ariaExpanded?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) => {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);

  const activeTab =
    activeTabId === null
      ? null
      : (tabs.find((tab) => tab.id === activeTabId) ?? null);

  const isDisabled = disabled ?? item.disabled ?? false;

  const isActive =
    (item.sectionKey !== undefined &&
    activeTab?.sectionKey === item.sectionKey &&
    pathname !== "/folders"
      ? true
      : false) || isNavItemActiveByLocation(item, pathname, search);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    item.onClick?.();
    if (item.sectionKey) {
      openSectionTab(item.sectionKey);
    }

    if (item.to) {
      navigate(item.to);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      className={cn(
        "app-sidebar__nav-link",
        nested && "app-sidebar__nav-link--nested",
        isActive && "is-active",
        isDisabled && "app-sidebar__nav-link--disabled",
        compact && "app-sidebar__nav-link--collapsed",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-expanded={ariaExpanded}
      aria-label={compact ? item.label : undefined}
    >
      <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      <span className="app-sidebar__nav-label">{item.label}</span>
      {trailing ? (
        <span className="app-sidebar__nav-trailing">{trailing}</span>
      ) : null}
    </button>
  );
};

const AppSidebar = ({ collapsed = false, onOpenSettings }: AppSidebarProps) => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const selectedLibraryChild = new URLSearchParams(search).get("libraryType");
  const closeCalendar = useExplorerCalendarViewStore((state) => state.close);
  const openGlobalSearch = useGlobalSearchStore((state) => state.open);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);

  const isCompact = collapsed && !isRailExpanded;
  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      closeCalendar();
      item.onClick?.();
      if (item.id === "library" && !isCompact) {
        setIsLibraryOpen((isOpen) => !isOpen);
      }
      if (item.id === "explore") {
        openGlobalSearch();
      }
    },
  }));
  const footerItems: AppSidebarNavItem[] = [
    {
      id: "settings",
      label: "設定",
      icon: <GearIcon className="app-sidebar__nav-icon" />,
      onClick: onOpenSettings,
    },
  ];

  const openLibraryChild = (libraryType: string) => {
    closeCalendar();
    openSectionTab("library");
    navigate(`/folders?view=section-list&libraryType=${libraryType}`);
  };

  const handleBlurCapture = (event: FocusEvent<HTMLElement>) => {
    if (!collapsed) return;
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
      setIsRailExpanded(false);
    }
  };

  return (
    <aside
      className={cn(
        "app-sidebar",
        isCompact && "app-sidebar--collapsed",
        collapsed && isRailExpanded && "app-sidebar--rail-expanded",
      )}
      aria-label="Sidebar"
      data-collapsed={collapsed ? "1" : undefined}
      onMouseEnter={collapsed ? () => setIsRailExpanded(true) : undefined}
      onMouseLeave={collapsed ? () => setIsRailExpanded(false) : undefined}
      onFocusCapture={collapsed ? () => setIsRailExpanded(true) : undefined}
      onBlurCapture={handleBlurCapture}
    >
      <div className="app-sidebar__top">
        <div className="app-sidebar__workspace">
          <div className="app-sidebar__workspace-avatar">C</div>
          <div className="app-sidebar__workspace-copy">
            <div className="app-sidebar__workspace-name">
              <span>Atlas, Inc</span>
              <ChevronDownIcon className="app-sidebar__workspace-chevron" />
            </div>
            <div className="app-sidebar__sync">
              <CloudIcon className="app-sidebar__sync-icon" />
              <span>同期中</span>
            </div>
          </div>
        </div>

        <nav className="app-sidebar__nav" aria-label="Primary navigation">
          {mainNavItemsWithActions.map((item) =>
            item.id === "library" ? (
              <div key={item.id} className="app-sidebar__library-group">
                <AppSidebarNavLink
                  item={item}
                  ariaExpanded={!isCompact ? isLibraryOpen : undefined}
                  compact={isCompact}
                  trailing={
                    <ChevronDownIcon
                      className={cn(
                        "app-sidebar__nav-chevron",
                        isLibraryOpen && "is-open",
                      )}
                    />
                  }
                />
                {!isCompact && isLibraryOpen ? (
                  <div
                    className="app-sidebar__nested-group app-sidebar__library-children"
                    aria-label="Library sections"
                  >
                    {libraryChildItems.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={cn(
                          "app-sidebar__library-child",
                          selectedLibraryChild === item.value && "is-active",
                        )}
                        onClick={() => openLibraryChild(item.value)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <AppSidebarNavLink
                key={item.id}
                item={item}
                compact={isCompact}
              />
            ),
          )}
        </nav>
      </div>

      <div className="app-sidebar__bottom">
        <div className="app-sidebar__trial">
          <p>
            トライアル期間の残り <strong>6 日</strong>
            <br />
            すべての機能をお試しいただけます。
          </p>
          <button type="button">アップグレード</button>
        </div>
        <nav className="app-sidebar__nav" aria-label="Support navigation">
          {footerItems.map((item) => (
            <AppSidebarNavLink key={item.id} item={item} compact={isCompact} />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export { AppSidebar };
