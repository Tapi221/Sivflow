import { useState, type MouseEvent, type ReactNode } from "react";
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
  sectionKey?: "home" | "review" | "library" | "calendar";
  onClick?: () => void;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
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
    <path d="M4 10.5 12 4l8 6.5V20h-5v-5H9v5H4v-9.5Z" fill="currentColor" />
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
    <rect
      x="5"
      y="6"
      width="14"
      height="13"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 4v4M16 4v4M5 10h14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.8"
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
      pathname === "/folders" &&
      searchParams.get("home") !== "1" &&
      searchParams.get("settings") !== "true",
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

const footerItems: AppSidebarNavItem[] = [
  {
    id: "settings",
    label: "設定",
    to: "/folders?settings=true",
    icon: <GearIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("settings") === "true",
  },
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
}: {
  item: AppSidebarNavItem;
  nested?: boolean;
  trailing?: ReactNode;
  ariaExpanded?: boolean;
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

  const isActive =
    (item.sectionKey !== undefined &&
    activeTab?.sectionKey === item.sectionKey &&
    pathname !== "/folders"
      ? true
      : false) || isNavItemActiveByLocation(item, pathname, search);

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
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
      className={cn(
        "app-sidebar__nav-link",
        nested && "app-sidebar__nav-link--nested",
        isActive && "is-active",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-expanded={ariaExpanded}
    >
      <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      <span className="app-sidebar__nav-label">{item.label}</span>
      {trailing ? (
        <span className="app-sidebar__nav-trailing">{trailing}</span>
      ) : null}
    </button>
  );
};

const AppSidebar = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const selectedLibraryChild = new URLSearchParams(search).get("libraryType");
  const closeCalendar = useExplorerCalendarViewStore((state) => state.close);
  const openGlobalSearch = useGlobalSearchStore((state) => state.open);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);
  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      closeCalendar();
      item.onClick?.();
      if (item.id === "library") {
        setIsLibraryOpen((isOpen) => !isOpen);
      }
      if (item.id === "explore") {
        openGlobalSearch();
      }
    },
  }));

  const openLibraryChild = (libraryType: string) => {
    closeCalendar();
    openSectionTab("library");
    navigate(`/folders?view=section-list&libraryType=${libraryType}`);
  };

  return (
    <aside className="app-sidebar" aria-label="Sidebar">
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
                  ariaExpanded={isLibraryOpen}
                  trailing={
                    <ChevronDownIcon
                      className={cn(
                        "app-sidebar__nav-chevron",
                        isLibraryOpen && "is-open",
                      )}
                    />
                  }
                />
                {isLibraryOpen ? (
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
              <AppSidebarNavLink key={item.id} item={item} />
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
            <AppSidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export { AppSidebar };
