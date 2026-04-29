import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { cn } from "@/lib/utils";

type AppSidebarNavItem = {
  id: string;
  label: string;
  to: string;
  icon: ReactNode;
  exactPath?: boolean;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type SidebarIconProps = {
  className?: string;
};

const IconShell = ({ children, className }: SidebarIconProps & { children: ReactNode }) => (
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
    <path d="M5 7h14l1.5 10H15l-1.3 2h-3.4L9 17H3.5L5 7Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
  </IconShell>
);

const ArchiveIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M4.5 7h15M6 7l1 12h10l1-12M8.5 11h7" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </IconShell>
);

const UserPlusIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <circle cx="9" cy="9" r="3" fill="currentColor" />
    <path d="M3.8 19c.8-3.2 2.5-4.8 5.2-4.8 2.4 0 4 1.3 4.9 3.8M17 8v6M14 11h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </IconShell>
);

const FileIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M6 4.5h8l4 4V20H6V4.5Z" fill="currentColor" />
  </IconShell>
);

const CalendarIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <rect x="5" y="6" width="14" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 4v4M16 4v4M5 10h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </IconShell>
);

const MapIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M4 6.5 9.5 4l5 2.5L20 4v13.5L14.5 20l-5-2.5L4 20V6.5Z" fill="currentColor" opacity="0.9" />
  </IconShell>
);

const HashIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M9 4 7 20M17 4l-2 16M5 9h15M4 15h15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
  </IconShell>
);

const CheckIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
    <path d="m8.5 12 2.2 2.2 4.8-5" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </IconShell>
);

const TeamIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <circle cx="12" cy="8" r="2.4" fill="currentColor" />
    <circle cx="6.8" cy="10.5" r="2" fill="currentColor" opacity="0.75" />
    <circle cx="17.2" cy="10.5" r="2" fill="currentColor" opacity="0.75" />
    <path d="M7 19c.7-3 2.4-4.5 5-4.5s4.3 1.5 5 4.5M2.8 17.5c.5-2 1.6-3 3.4-3M21.2 17.5c-.5-2-1.6-3-3.4-3" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
  </IconShell>
);

const FolderIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M4 7h6l2 2h8v9H4V7Z" fill="currentColor" />
  </IconShell>
);

const PlayIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M5 7.5 12 12l-7 4.5v-9ZM12 7.5l7 4.5-7 4.5v-9Z" fill="currentColor" />
  </IconShell>
);

const GearIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M12 8.5A3.5 3.5 0 1 1 12 15.5 3.5 3.5 0 0 1 12 8.5Zm7.5 3.5c0-.5-.1-1-.2-1.5l2-1.5-2-3.4-2.4 1a8.7 8.7 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.6A8.7 8.7 0 0 0 7 6.6l-2.4-1-2 3.4 2 1.5a7.1 7.1 0 0 0 0 3l-2 1.5 2 3.4 2.4-1a8.7 8.7 0 0 0 2.6 1.5L10 21.5h4l.4-2.6a8.7 8.7 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.5c.1-.5.2-1 .2-1.5Z" fill="currentColor" />
  </IconShell>
);

const CloudIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="M7.5 17.5h9.3a3.2 3.2 0 0 0 .3-6.4A5.4 5.4 0 0 0 6.8 9.8 3.9 3.9 0 0 0 7.5 17.5Z" fill="currentColor" opacity="0.45" />
    <path d="M12 9.5v5M9.8 11.7 12 9.5l2.2 2.2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </IconShell>
);

const ChevronDownIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="m8 10 4 4 4-4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </IconShell>
);

const ChevronRightIcon = ({ className }: SidebarIconProps) => (
  <IconShell className={className}>
    <path d="m10 8 4 4-4 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
  </IconShell>
);

const mainNavItems: AppSidebarNavItem[] = [
  {
    id: "home",
    label: "Home",
    to: "/folders?home=1",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "inbox",
    label: "Inbox",
    to: "/directory",
    icon: <InboxIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "saved-items",
    label: "Saved items",
    to: "/folders",
    icon: <ArchiveIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" &&
      searchParams.get("home") !== "1" &&
      searchParams.get("content") !== "pdf" &&
      searchParams.get("content") !== "note",
  },
];

const workspaceItems: AppSidebarNavItem[] = [
  {
    id: "my-tasks",
    label: "My tasks",
    to: "/gallery",
    icon: <UserPlusIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "projects",
    label: "Projects",
    to: "/folders?content=pdf",
    icon: <FileIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "pdf",
  },
  {
    id: "calendar",
    label: "Calendar",
    to: "/folders?content=note",
    icon: <CalendarIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "note",
  },
  {
    id: "roadmaps",
    label: "Roadmaps",
    to: "/tag-map",
    icon: <MapIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
];

const footerItems: AppSidebarNavItem[] = [
  {
    id: "settings",
    label: "Settings",
    to: "/folders?settings=true",
    icon: <GearIcon className="app-sidebar__nav-icon" />,
  },
];

const isNavItemActive = (
  item: AppSidebarNavItem,
  pathname: string,
  search: string,
) => {
  const normalizedPathname = pathname.toLowerCase();
  const searchParams = new URLSearchParams(search);

  if (item.match) {
    return item.match(normalizedPathname, searchParams);
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
}: {
  item: AppSidebarNavItem;
  nested?: boolean;
  trailing?: ReactNode;
}) => {
  const { pathname, search } = useLocation();
  const isActive = isNavItemActive(item, pathname, search);

  return (
    <NavLink
      to={item.to}
      className={cn(
        "app-sidebar__nav-link",
        nested && "app-sidebar__nav-link--nested",
        isActive && "is-active",
      )}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      <span className="app-sidebar__nav-label">{item.label}</span>
      {trailing ? <span className="app-sidebar__nav-trailing">{trailing}</span> : null}
    </NavLink>
  );
};

const AppSidebarSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <section className="app-sidebar__section">
    <div className="app-sidebar__section-title">
      <span>{title}</span>
      <ChevronDownIcon className="app-sidebar__section-chevron" />
    </div>
    {children}
  </section>
);

export const AppSidebar = () => {
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
              <span>Syncing up</span>
            </div>
          </div>
        </div>

        <nav className="app-sidebar__nav" aria-label="Primary navigation">
          {mainNavItems.map((item) => (
            <AppSidebarNavLink key={item.id} item={item} />
          ))}
        </nav>

        <AppSidebarSection title="Workspace">
          <nav className="app-sidebar__nav" aria-label="Workspace navigation">
            {workspaceItems.map((item) => (
              <AppSidebarNavLink key={item.id} item={item} />
            ))}
          </nav>
        </AppSidebarSection>

        <AppSidebarSection title="Your channels">
          <nav className="app-sidebar__nav" aria-label="Channel navigation">
            <AppSidebarNavLink
              item={{
                id: "engineering",
                label: "Engineering",
                to: "/folders",
                icon: <HashIcon className="app-sidebar__nav-icon" />,
              }}
              trailing={<ChevronDownIcon className="app-sidebar__item-chevron" />}
            />
            <div className="app-sidebar__nested-group">
              <AppSidebarNavLink
                nested
                item={{
                  id: "docs",
                  label: "Docs",
                  to: "/directory",
                  icon: <CheckIcon className="app-sidebar__nav-icon" />,
                }}
              />
              <AppSidebarNavLink
                nested
                item={{
                  id: "teams",
                  label: "Teams",
                  to: "/gallery",
                  icon: <TeamIcon className="app-sidebar__nav-icon" />,
                }}
              />
              <AppSidebarNavLink
                nested
                item={{
                  id: "initiatives",
                  label: "Initiatives",
                  to: "/tag-map",
                  icon: <FolderIcon className="app-sidebar__nav-icon" />,
                }}
              />
              <AppSidebarNavLink
                nested
                item={{
                  id: "active-sprint",
                  label: "Active sprint",
                  to: "/folders?content=pdf",
                  icon: <PlayIcon className="app-sidebar__nav-icon" />,
                }}
              />
            </div>
            <AppSidebarNavLink
              item={{
                id: "design",
                label: "Design",
                to: "/folders?content=note",
                icon: <HashIcon className="app-sidebar__nav-icon" />,
              }}
              trailing={<ChevronRightIcon className="app-sidebar__item-chevron" />}
            />
            <AppSidebarNavLink
              item={{
                id: "marketing",
                label: "Marketing",
                to: "/trash",
                icon: <HashIcon className="app-sidebar__nav-icon" />,
              }}
              trailing={<ChevronRightIcon className="app-sidebar__item-chevron" />}
            />
          </nav>
        </AppSidebarSection>
      </div>

      <div className="app-sidebar__bottom">
        <div className="app-sidebar__trial">
          <p>
            There are <strong>6 days</strong> left in your trial. Upgrade for
            unlimited access.
          </p>
          <button type="button">Upgrade</button>
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
