import { signOut } from "firebase/auth";
import { type MouseEvent, type ReactNode } from "react";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { ClockIcon, GalleryIcon, HomeIcon, SettingIcon, SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { HoverTooltip } from "@/chip/toolchip/HoverTooltip";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { cn } from "@/lib/utils";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { auth } from "@/services/firebase";
import { StratisTagIcon } from "@/ui/icons/stratis";
import "./sidebar.desktop.css";
import "./sidebar.layered-directory.css";

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
    icon: <ExplorerChromeFolderIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
  },
  {
    id: "tags",
    label: "タグ",
    icon: <StratisTagIcon className="app-sidebar__nav-icon" />,
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

const handleDevLogout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("[Sidebar] Logout failed:", error);
  }
};

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
    <HoverTooltip label={item.label} side="right" offset={0} className="w-8 min-w-8" arrowClassName="hidden">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={cn(
          "app-sidebar__nav-link",
          isActive && "is-active",
          isDisabled && "app-sidebar__nav-link--disabled",
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

const Sidebar = ({
  isClosed = false,
  onToggleClosed,
  onOpenSettings,
}: SidebarProps) => {
  const openSearch = useSearchStore((s) => s.open);

  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      item.onClick?.();

      if (item.id === "explore") {
        openSearch();
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
        <HoverTooltip label="ログアウト" side="right" offset={0} className="w-8 min-w-8" arrowClassName="hidden">
          <button type="button" onClick={handleDevLogout} aria-label="ログアウト">
            ろ
          </button>
        </HoverTooltip>

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
