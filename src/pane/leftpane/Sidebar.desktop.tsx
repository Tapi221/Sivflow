import { type MouseEvent, type ReactNode } from "react";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";
import { cn } from "@/lib/utils";
import { ClockIcon, GalleryIcon, HomeIcon, LibraryIcon, SettingIcon, SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import "./sidebar.desktop.css";
import "./sidebar.layered-directory.css";

// ── 型定義 ───────────────────────────────────────────────────

type SidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  sectionKey?: "home" | "review" | "library" | "schedule" | "settings";
  onClick?: () => void;
  disabled?: boolean;
};

type SidebarProps = {
  isClosed?: boolean;
  onToggleClosed?: () => void;
  onOpenSettings?: () => void;
};

// ── ナビゲーション定義 ──────────────────────────────────────

const mainNavItems: SidebarNavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    sectionKey: "home",
  },
  {
    id: "library",
    label: "Library",
    icon: <LibraryIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
  },
  {
    id: "calendar",
    label: "Schedule",
    icon: <ClockIcon className="app-sidebar__nav-icon" />,
    sectionKey: "schedule",
  },
  {
    id: "explore",
    label: "探す",
    icon: <GalleryIcon className="app-sidebar__nav-icon" />,
  },
];

// ── ナビリンク（レール: アイコン＋aria-label） ───────────────

const SidebarNavLink = ({
  item,
  disabled,
}: {
  item: SidebarNavItem;
  disabled?: boolean;
}) => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);

  const activeTab =
    activeTabId === null
      ? null
      : (tabs.find((tab) => tab.id === activeTabId) ?? null);

  const isDisabled = disabled ?? item.disabled ?? false;
  const isActive = item.sectionKey !== undefined && activeTab?.sectionKey === item.sectionKey;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isDisabled) return;

    item.onClick?.();

    if (item.sectionKey) {
      openSectionTab(item.sectionKey);
    }
  };

  return (
    <HoverTooltip label={item.label} side="right" className="w-full">
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
      >
        <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
        <span className="app-sidebar__nav-label">{item.label}</span>
      </button>
    </HoverTooltip>
  );
};

// ── Sidebar本体 ──────────────────────────────────────────────

const Sidebar = ({
  isClosed = false,
  onToggleClosed,
  onOpenSettings,
}: SidebarProps) => {
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);

  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
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
      icon: <SettingIcon className="app-sidebar__nav-icon" />,
      sectionKey: "settings",
      onClick: onOpenSettings,
    },
  ];

  const sidebarToggleLabel = isClosed ? "サイドバーを開く" : "サイドバーを閉じる";

  return (
    <aside
      className={cn("app-sidebar", isClosed && "app-sidebar--closed")}
      aria-label="Sidebar"
    >
      <div className="app-sidebar__top">
        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={onToggleClosed}
          aria-label={sidebarToggleLabel}
        >
          <SidebarOpenIcon className="app-sidebar__toggle-icon" />
        </button>

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
