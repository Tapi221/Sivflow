import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

import { ExplorerStorageUsageCard } from "@/components/explorer/ExplorerStorageUsageCard";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
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

const ManifoliaLeafMark = () => {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 40 40"
      className="app-sidebar__brand-icon"
      fill="none"
    >
      <path
        d="M31.7 5.4C19.9 6.7 9 15.8 7.3 28.9c9.2.5 22.7-5.2 24.4-23.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M8.3 29.1 30.5 7.2M14.4 23.3l.1-9.5M20.8 17.1l8.2.4M11.9 31.9c-1.3 1.8-3.2 3-5.4 3.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const HomeIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 10.7 12 3l9 7.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M5.5 9.5V21h13V9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M9.5 21v-6h5v6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const GalleryIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4"
        width="17"
        height="16"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <path
        d="M7.2 15.8 10.4 12l2.4 2.6 2-2.1 2.9 3.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <circle cx="8.8" cy="8.8" r="1.3" stroke="currentColor" strokeWidth="1.85" />
    </svg>
  );
};

const LibraryIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M14 3.8V8.5h4.7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M8.5 13h7M8.5 16h5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const PdfIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3.5h7.2L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 20V5A1.5 1.5 0 0 1 7 3.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M14 3.8V8.5h4.7"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const FlashcardIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4"
        y="5"
        width="12.5"
        height="15"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.85"
      />
      <path
        d="M8 8.5h4.5M8 12h5.5M8 15.5h3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
      <path
        d="M16.5 9H18a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const NoteIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 20.5h4.2L20.4 9.3a2.2 2.2 0 0 0-3.1-3.1L6.1 17.4 5 20.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <path
        d="M15.8 7.7l3.1 3.1"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const TagIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.7 12.8 11.5 6H19v7.5l-6.8 6.8a1.8 1.8 0 0 1-2.5 0l-5-5a1.8 1.8 0 0 1 0-2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
      <circle cx="16" cy="9" r="1" fill="currentColor" />
    </svg>
  );
};

const TrashIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 7.5h11M9.2 7.5V5.2h5.6v2.3M8.2 10.5l.7 8M12 10.5v8M15.8 10.5l-.7 8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.85"
      />
      <path
        d="M7 7.5 8 21h8l1-13.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.85"
      />
    </svg>
  );
};

const ChevronDownIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m8 10 4 4 4-4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
};

const primaryNavItems: AppSidebarNavItem[] = [
  {
    id: "home",
    label: "ホーム",
    to: "/folders?home=1",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "gallery",
    label: "ギャラリー",
    to: "/gallery",
    icon: <GalleryIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "library",
    label: "ライブラリ",
    to: "/directory",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "pdf",
    label: "PDF",
    to: "/folders?content=pdf",
    icon: <PdfIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "pdf",
  },
  {
    id: "flashcards",
    label: "フラッシュカード",
    to: "/folders",
    icon: <FlashcardIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" &&
      searchParams.get("home") !== "1" &&
      searchParams.get("content") !== "pdf" &&
      searchParams.get("content") !== "note",
  },
  {
    id: "note",
    label: "ノート",
    to: "/folders?content=note",
    icon: <NoteIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("content") === "note",
  },
  {
    id: "tags",
    label: "タグ",
    to: "/tag-map",
    icon: <TagIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
];

const secondaryNavItems: AppSidebarNavItem[] = [
  {
    id: "trash",
    label: "ごみ箱",
    to: "/trash",
    icon: <TrashIcon className="app-sidebar__nav-icon" />,
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
  const { currentUser } = useAuthSession();
  const displayName =
    currentUser?.displayName ?? currentUser?.email?.split("@")[0] ?? "User";
  const planLabel = currentUser ? "プレミアムプラン" : "ローカルプラン";
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";

  return (
    <aside className="app-sidebar" aria-label="アプリのサイドバー">
      <Link className="app-sidebar__brand" to="/folders?home=1">
        <ManifoliaLeafMark />
        <span className="app-sidebar__brand-name">Manifolia</span>
      </Link>

      <nav className="app-sidebar__nav" aria-label="メインナビゲーション">
        {primaryNavItems.map((item) => (
          <AppSidebarNavLink key={item.id} item={item} />
        ))}
      </nav>

      <nav
        className="app-sidebar__nav app-sidebar__nav--secondary"
        aria-label="補助ナビゲーション"
      >
        {secondaryNavItems.map((item) => (
          <AppSidebarNavLink key={item.id} item={item} />
        ))}
      </nav>

      <div className="app-sidebar__spacer" />

      <div className="app-sidebar__storage">
        <ExplorerStorageUsageCard />
      </div>

      <div className="app-sidebar__account" aria-label={`${displayName} の現在のプラン`}>
        <div className="app-sidebar__avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="app-sidebar__account-text">
          <div className="app-sidebar__account-name">{displayName}</div>
          <div className="app-sidebar__account-plan">{planLabel}</div>
        </div>
        <ChevronDownIcon className="app-sidebar__account-chevron" />
      </div>
    </aside>
  );
};
