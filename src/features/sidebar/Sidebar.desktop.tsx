import {
  useState,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { UpgradePanel } from "./upgradepanel";
import "./sidebar.desktop.css";
import { cn } from "@/lib/utils";
import { useExplorerCalendarViewStore } from "@/features/calendar/header/useExplorerCalendarViewStore";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import {
  HomeIcon,
  InboxIcon,
  CalendarIcon,
  LibraryIcon,
  ExploreIcon,
  GearIcon,
  CloudIcon,
  ChevronDownIcon,
} from "./sidebar.icons";

type SidebarNavItem = {
  id: string;
  label: string;
  to?: string;
  icon: ReactNode;
  exactPath?: boolean;
  sectionKey?: "home" | "review" | "library" | "calendar";
  onClick?: () => void;
  disabled?: boolean;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type SidebarProps = {
  collapsed?: boolean;
  onOpenSettings?: () => void;
};

const mainNavItems: SidebarNavItem[] = [
  {
    id: "home",
    label: "Home",
    to: "/folders?home=1",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    sectionKey: "home",
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "review",
    label: "Review",
    to: "/gallery",
    icon: <InboxIcon className="app-sidebar__nav-icon" />,
    sectionKey: "review",
    exactPath: true,
  },
  {
    id: "library",
    label: "Library",
    to: "/folders?view=section-list",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") !== "1",
  },
  {
    id: "calendar",
    label: "Schedule",
    to: "/calendar",
    icon: <CalendarIcon className="app-sidebar__nav-icon" />,
    sectionKey: "calendar",
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
  item: SidebarNavItem,
  pathname: string,
  search: string,
) => {
  const normalizedPathname = pathname.toLowerCase();
  const searchParams = new URLSearchParams(search);

  if (item.match) return item.match(normalizedPathname, searchParams);

  if (!item.to) return false;

  const targetPath = item.to.split("?")[0]?.toLowerCase() ?? item.to;

  if (item.exactPath) return normalizedPathname === targetPath;

  return (
    normalizedPathname === targetPath ||
    normalizedPathname.startsWith(`${targetPath}/`)
  );
};

const SidebarNavLink = ({
  item,
  trailing,
  ariaExpanded,
  disabled,
  compact,
}: {
  item: SidebarNavItem;
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
    if (isDisabled) return;

    item.onClick?.();

    if (item.sectionKey) openSectionTab(item.sectionKey);
    if (item.to) navigate(item.to);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled ? true : undefined}
      className={cn(
        "app-sidebar__nav-link",
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

const Sidebar = ({ collapsed = false, onOpenSettings }: SidebarProps) => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isRailExpanded, setIsRailExpanded] = useState(false);

  const selectedLibraryChild = new URLSearchParams(search).get("libraryType");

  const closeCalendar = useExplorerCalendarViewStore((s) => s.close);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const openSectionTab = useWorkspaceTabsStore((s) => s.openSectionTab);

  const isCompact = collapsed && !isRailExpanded;

  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      closeCalendar();
      item.onClick?.();

      if (item.id === "library" && !isCompact) {
        setIsLibraryOpen((v) => !v);
      }

      if (item.id === "explore") {
        openGlobalSearch();
      }
    },
  }));

  const footerItems: SidebarNavItem[] = [
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

        <nav className="app-sidebar__nav">
          {mainNavItemsWithActions.map((item) =>
            item.id === "library" ? (
              <div key={item.id}>
                <SidebarNavLink
                  item={item}
                  ariaExpanded={!isCompact ? isLibraryOpen : undefined}
                  compact={isCompact}
                  trailing={
                    <ChevronDownIcon
                      className={cn(isLibraryOpen && "is-open")}
                    />
                  }
                />

                {!isCompact && isLibraryOpen && (
                  <div className="app-sidebar__library-children">
                    {libraryChildItems.map((child) => (
                      <button
                        key={child.value}
                        type="button"
                        className={cn(
                          selectedLibraryChild === child.value && "is-active",
                        )}
                        onClick={() => openLibraryChild(child.value)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <SidebarNavLink key={item.id} item={item} compact={isCompact} />
            ),
          )}
        </nav>
      </div>

      <div className="app-sidebar__bottom">
        <UpgradePanel compact={isCompact} />

        <nav className="app-sidebar__nav">
          {footerItems.map((item) => (
            <SidebarNavLink key={item.id} item={item} compact={isCompact} />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export { Sidebar };
