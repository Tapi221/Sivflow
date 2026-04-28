import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";

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
      viewBox="0 0 48 48"
      className="h-8 w-8 shrink-0"
      fill="none"
    >
      <path
        d="M24.1 8.2C18 12.8 15.6 18.9 17.2 25.1C20.6 23.7 23.3 21.5 25.2 18.4C27 15.4 26.7 11.9 24.1 8.2Z"
        fill="url(#appSidebarLeafTop)"
      />
      <path
        d="M12.1 18.1C20.6 18.5 26.8 23.1 30.3 31.7C22.7 32.1 16.8 29.2 12.9 22.9C12.2 21.7 11.9 20.1 12.1 18.1Z"
        fill="url(#appSidebarLeafLeft)"
      />
      <path
        d="M35.9 18.1C27.4 18.5 21.2 23.1 17.7 31.7C25.3 32.1 31.2 29.2 35.1 22.9C35.8 21.7 36.1 20.1 35.9 18.1Z"
        fill="url(#appSidebarLeafRight)"
      />
      <path
        d="M24 8.2V35"
        stroke="rgba(63,106,78,0.36)"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      <defs>
        <linearGradient
          id="appSidebarLeafTop"
          x1="19"
          x2="29"
          y1="9"
          y2="27"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#c9d3ad" />
          <stop offset="1" stopColor="#879766" />
        </linearGradient>
        <linearGradient
          id="appSidebarLeafLeft"
          x1="12"
          x2="30"
          y1="18"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6c8d72" />
          <stop offset="1" stopColor="#355f46" />
        </linearGradient>
        <linearGradient
          id="appSidebarLeafRight"
          x1="36"
          x2="18"
          y1="18"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#93aa80" />
          <stop offset="1" stopColor="#426d52" />
        </linearGradient>
      </defs>
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
        d="M4.25 10.7L12 4.35L19.75 10.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path
        d="M6.75 10.2V19.25H17.25V10.2"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
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
        d="M5.25 4.75H14.5C15.74 4.75 16.75 5.76 16.75 7V19.25H7.5C6.26 19.25 5.25 18.24 5.25 17V4.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M8.25 8.5H13.75M8.25 12H13.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
      />
      <path
        d="M16.75 7.25H18.25C18.8 7.25 19.25 7.7 19.25 8.25V21.25H8.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
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
        x="5"
        y="6.25"
        width="12.5"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path
        d="M7.5 3.75H17C18.1 3.75 19 4.65 19 5.75V15"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M8.5 10H14M8.5 13.25H12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
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
        d="M6.25 3.75H13.5L18.25 8.5V20.25H6.25V3.75Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M13.5 3.75V8.5H18.25"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M8.6 14.35H10.1C10.72 14.35 11.2 13.88 11.2 13.28C11.2 12.67 10.72 12.2 10.1 12.2H8.6V16.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.45"
      />
      <path
        d="M12.6 12.2H13.75C14.8 12.2 15.55 13.05 15.55 14.3C15.55 15.55 14.8 16.4 13.75 16.4H12.6V12.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.45"
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
        d="M5.25 5.25C5.25 4.42 5.92 3.75 6.75 3.75H17.25C18.08 3.75 18.75 4.42 18.75 5.25V18.75C18.75 19.58 18.08 20.25 17.25 20.25H6.75C5.92 20.25 5.25 19.58 5.25 18.75V5.25Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M8.25 8.25H15.75M8.25 11.75H15.75M8.25 15.25H12.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
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
        d="M4.75 12.1V5.75H11.1L19.25 13.9L13.9 19.25L4.75 12.1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <circle cx="8.35" cy="8.35" r="1.2" fill="currentColor" />
    </svg>
  );
};

const CollectionIcon = ({ className }: SidebarIconProps) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="4.75"
        y="6.25"
        width="14.5"
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.65"
      />
      <path
        d="M8.25 4.25H15.75M8.25 19.75H15.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
      />
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
        d="M4.75 6.5H19.25"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
      />
      <path
        d="M9.25 6.5V4.75H14.75V6.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M6.75 6.5L7.65 19.25H16.35L17.25 6.5"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.65"
      />
      <path
        d="M10.25 10.25V16M13.75 10.25V16"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.65"
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
        d="M7.5 9.5L12 14L16.5 9.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
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
      pathname.toLowerCase() === "/folders" && searchParams.get("home") === "1",
  },
  {
    id: "library",
    label: "ライブラリ",
    to: "/directory",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "flashcards",
    label: "フラッシュカード",
    to: "/folders",
    icon: <FlashcardIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname.toLowerCase() === "/folders" &&
      searchParams.get("home") !== "1" &&
      searchParams.get("content") !== "pdf" &&
      searchParams.get("content") !== "note",
  },
  {
    id: "pdf",
    label: "PDF",
    to: "/folders?content=pdf",
    icon: <PdfIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname.toLowerCase() === "/folders" &&
      searchParams.get("content") === "pdf",
  },
  {
    id: "note",
    label: "ノート",
    to: "/folders?content=note",
    icon: <NoteIcon className="app-sidebar__nav-icon" />,
    match: (pathname, searchParams) =>
      pathname.toLowerCase() === "/folders" &&
      searchParams.get("content") === "note",
  },
  {
    id: "tags",
    label: "タグ",
    to: "/tag-map",
    icon: <TagIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
  {
    id: "collections",
    label: "コレクション",
    to: "/gallery",
    icon: <CollectionIcon className="app-sidebar__nav-icon" />,
    exactPath: true,
  },
];

const secondaryNavItems: AppSidebarNavItem[] = [
  {
    id: "trash",
    label: "ゴミ箱",
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

  return normalizedPathname === targetPath || normalizedPathname.startsWith(
    `${targetPath}/`,
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
    currentUser?.displayName ??
    currentUser?.email?.split("@")[0] ??
    "User";
  const planLabel = currentUser ? "プレミアムプラン" : "ローカルプラン";
  const initial = displayName.trim().charAt(0).toUpperCase() || "M";

  return (
    <aside className="app-sidebar" aria-label="アプリケーションナビゲーション">
      <div className="app-sidebar__brand">
        <div className="app-sidebar__brand-mark">
          <ManifoliaLeafMark />
        </div>
        <div className="app-sidebar__brand-name">Manifolia</div>
      </div>

      <nav className="app-sidebar__nav" aria-label="メイン">
        {primaryNavItems.map((item) => (
          <AppSidebarNavLink key={item.id} item={item} />
        ))}
      </nav>

      <nav className="app-sidebar__nav app-sidebar__nav--secondary" aria-label="補助">
        {secondaryNavItems.map((item) => (
          <AppSidebarNavLink key={item.id} item={item} />
        ))}
      </nav>

      <div className="app-sidebar__spacer" />

      <div className="app-sidebar__storage">
        <ExplorerStorageUsageCard />
      </div>

      <div className="app-sidebar__account">
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
