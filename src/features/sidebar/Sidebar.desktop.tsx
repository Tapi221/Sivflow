/**
 * Sidebar.desktop.tsx
 *
 * 常時レール表示（アイコンのみ）。
 * collapsed / expanded の切り替えロジックを廃止し、
 * コンポーネントは常に compact=true で動作する。
 *
 * 将来の拡張: Electron / Swift / Android では
 * --app-sidebar-rail-width CSS変数を各プラットフォームの
 * レイアウトファイルで上書きすることで幅を調整できる。
 */

import {
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useSchedulePaneStore } from "@/features/calendar/header/useSchedulePaneStore";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";

import "./sidebar.desktop.css";

import {
  CalendarIcon,
  ChevronDownIcon,
  CloudIcon,
  ExploreIcon,
  GearIcon,
  HomeIcon,
  InboxIcon,
  LibraryIcon,
} from "../../icons/sidebar.icons";

import { cn } from "@/lib/utils";

// ── 型定義 ───────────────────────────────────────────────────

type SidebarNavItem = {
  id: string;
  label: string;
  to?: string;
  icon: ReactNode;
  exactPath?: boolean;
  sectionKey?: "home" | "review" | "library" | "schedule";
  onClick?: () => void;
  disabled?: boolean;
  match?: (pathname: string, searchParams: URLSearchParams) => boolean;
};

type SidebarProps = {
  onOpenSettings?: () => void;
};

// ── ナビゲーション定義 ──────────────────────────────────────

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
    to: "/study",
    icon: <InboxIcon className="app-sidebar__nav-icon" />,
    sectionKey: "review",
    exactPath: true,
  },
  {
    id: "library",
    label: "Library",
    to: "/folders?view=section-list&libraryType=pdf",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
    match: (pathname, searchParams) =>
      pathname === "/folders" && searchParams.get("home") !== "1",
  },
  {
    id: "calendar",
    label: "Schedule",
    to: "/schedule",
    icon: <CalendarIcon className="app-sidebar__nav-icon" />,
    sectionKey: "schedule",
    exactPath: true,
  },
  {
    id: "explore",
    label: "探す",
    icon: <ExploreIcon className="app-sidebar__nav-icon" />,
  },
];

// ── アクティブ状態の判定 ─────────────────────────────────────

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

// ── ナビリンク（レール: アイコン＋aria-label） ───────────────

const SidebarNavLink = ({
  item,
  disabled,
}: {
  item: SidebarNavItem;
  disabled?: boolean;
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
      className={cn(
        "app-sidebar__nav-link",
        isActive && "is-active",
        isDisabled && "app-sidebar__nav-link--disabled",
        "app-sidebar__nav-link--collapsed",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
      title={item.label}
    >
      <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      <span className="app-sidebar__nav-label">{item.label}</span>
    </button>
  );
};

// ── Sidebar本体 ──────────────────────────────────────────────

const Sidebar = ({ onOpenSettings }: SidebarProps) => {
  const closeCalendar = useSchedulePaneStore((s) => s.close);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      closeCalendar();
      item.onClick?.();

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

  return (
    <aside
      className="app-sidebar"
      aria-label="Sidebar"
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

        <nav className="app-sidebar__nav" aria-label="メインナビゲーション">
          {mainNavItemsWithActions.map((item) => (
            <SidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>

      <div className="app-sidebar__bottom">
        <nav className="app-sidebar__nav" aria-label="フッターナビゲーション">
          {footerItems.map((item) => (
            <SidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
};

export { Sidebar };