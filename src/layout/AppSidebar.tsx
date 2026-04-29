import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

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

const SnowUiMark = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 28 28"
      className="app-sidebar__brand-icon"
      fill="none"
    >
      <path
        d="M14 3v22M5.2 8.1l17.6 11.8M22.8 8.1 5.2 19.9"
        stroke="#69a7ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M14 6.2 17 3.8M14 6.2 11 3.8M14 21.8l3 2.4M14 21.8l-3 2.4M7.8 9.9 7.3 6M7.8 9.9 4.1 11.5M20.2 18.1l3.7-1.6M20.2 18.1l.5 3.9M20.2 9.9l.5-3.9M20.2 9.9l3.7 1.6M7.8 18.1 4.1 16.5M7.8 18.1l-.5 3.9"
        stroke="#69a7ff"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const OverviewIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    <path
      d="M12 4.5v7.2L6 15.4"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const EcommerceIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M6 8h12l-1 11H7L6 8Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <path
      d="M9 8a3 3 0 0 1 6 0M9 13h6"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

const ProjectsIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3.8 7.5h6l1.8 2h8.6v8.8H3.8V7.5Z"
      stroke="currentColor"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const ProfileIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="5.5"
      y="3.8"
      width="13"
      height="16.4"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M8.4 16.4c.8-1.8 2-2.7 3.6-2.7s2.8.9 3.6 2.7"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

const AccountIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="4.3"
      y="6"
      width="15.4"
      height="12"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <circle cx="9" cy="12" r="1.8" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M7 16c.4-1.4 1.1-2.1 2-2.1s1.6.7 2 2.1M13.8 10h3.2M13.8 13h2.4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

const CorporateIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="8" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="16" cy="9" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M4.2 18c.6-2.6 1.9-4 3.8-4s3.2 1.4 3.8 4M12.2 18c.6-2.6 1.9-4 3.8-4s3.2 1.4 3.8 4"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

const BlogIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect
      x="5"
      y="4.5"
      width="14"
      height="15"
      rx="1.4"
      stroke="currentColor"
      strokeWidth="1.7"
    />
    <path
      d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="1.7"
    />
  </svg>
);

const SocialIcon = ({ className }: SidebarIconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="9.2" cy="10" r="4.2" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12.5 13.4h3.8a3.4 3.4 0 0 1 0 6.8h-4.2a3.4 3.4 0 0 1-3.3-2.6"
      stroke="currentColor"
      strokeWidth="1.7"
    />
  </svg>
);

const primaryNavItems: AppSidebarNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    to: "/folders?home=1",
    icon: <OverviewIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "ecommerce",
    label: "eCommerce",
    to: "/gallery",
    icon: <EcommerceIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "projects",
    label: "Projects",
    to: "/directory",
    icon: <ProjectsIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "user-profile",
    label: "User Profile",
    to: "/folders?content=pdf",
    icon: <ProfileIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "pdf",
  },
  {
    id: "account",
    label: "Account",
    to: "/folders",
    icon: <AccountIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" &&
      searchParams.get("home") !== "1" &&
      searchParams.get("content") !== "pdf" &&
      searchParams.get("content") !== "note",
  },
  {
    id: "corporate",
    label: "Corporate",
    to: "/folders?content=note",
    icon: <CorporateIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "note",
  },
  {
    id: "blog",
    label: "Blog",
    to: "/tag-map",
    icon: <BlogIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "social",
    label: "Social",
    to: "/trash",
    icon: <SocialIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
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

const AppSidebarNavLink = ({ item }: { item: AppSidebarNavItem }) => {
  const { pathname, search } = useLocation();
  const isActive = isNavItemActive(item, pathname, search);

  return (
    <NavLink
      to={item.to}
      className={cn("app-sidebar__nav-link", isActive && "is-active")}
      aria-current={isActive ? "page" : undefined}
    >
      <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      <span className="app-sidebar__nav-label">{item.label}</span>
    </NavLink>
  );
};

export const AppSidebar = () => {
  return (
    <aside className="app-sidebar" aria-label="Sidebar">
      <div className="app-sidebar__top">
        <Link className="app-sidebar__brand" to="/folders?home=1">
          <SnowUiMark />
          <span className="app-sidebar__brand-name">snowui</span>
        </Link>

        <nav className="app-sidebar__nav" aria-label="Navigation">
          {primaryNavItems.map((item) => (
            <AppSidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>

      <div className="app-sidebar__account" aria-label="ByeWind">
        <div className="app-sidebar__avatar" aria-hidden="true">
          <span />
        </div>
        <div className="app-sidebar__account-text">
          <div className="app-sidebar__account-name">ByeWind</div>
        </div>
      </div>
    </aside>
  );
};
