import "./sidebar.desktop.css";
import { useT } from "@shared/i18n/useT";
import { LogOut, Tag } from "@web-renderer/chip/icons";
import { CalendarIcon, GalleryIcon, HomeIcon, SettingIcon, SidebarOpenIcon } from "@web-renderer/chip/icons/icons.sidebar";
import { HoverTooltip } from "@web-renderer/chip/panel/toolchip/HoverTooltip";
import { cn } from "@web-renderer/lib/utils";
import type { MouseEvent, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ExplorerChromeFolderIcon } from "@/components/explorer/icons";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import type { FolderTagMode } from "@/pane.desktop/leftpane/folder/useFolderTagModeStore";
import { useFolderTagModeStore } from "@/pane.desktop/leftpane/folder/useFolderTagModeStore";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";



type SidebarTranslationKey =
  | "sidebarHome"
  | "sidebarLibrary"
  | "sidebarTags"
  | "sidebarSchedule"
  | "sidebarExplore"
  | "sidebarSettings";
type SidebarNavItem = {
  id: string;
  labelKey: SidebarTranslationKey;
  icon: ReactNode;
  sectionKey?: "home" | "review" | "library" | "schedule" | "settings";
  folderTagMode?: FolderTagMode;
  onClick?: () => void;
  disabled?: boolean;
};
type SidebarProps = {
  isLeftPanelCollapsed?: boolean;
  onToggleLeftPanel?: () => void;
  onOpenSettings?: () => void;
};



const LIBRARY_EXPLORER_STATE = { isHomeOnlyMode: false, isSectionListMode: true, selectedFolderId: null, selectedItem: null };
const mainNavItems: SidebarNavItem[] = [
  {
    id: "home",
    labelKey: "sidebarHome",
    icon: <HomeIcon className="app-sidebar__nav-icon" />,
    sectionKey: "home",
  },
  {
    id: "library",
    labelKey: "sidebarLibrary",
    icon: <ExplorerChromeFolderIcon className="app-sidebar__nav-icon" />,
    sectionKey: "library",
    folderTagMode: "folder",
  },
  {
    id: "tags",
    labelKey: "sidebarTags",
    icon: <Tag className="app-sidebar__nav-icon" />,
    sectionKey: "library",
    folderTagMode: "tag",
  },
  {
    id: "calendar",
    labelKey: "sidebarSchedule",
    icon: <CalendarIcon className="app-sidebar__nav-icon" />,
    sectionKey: "schedule",
  },
  {
    id: "explore",
    labelKey: "sidebarExplore",
    icon: <GalleryIcon className="app-sidebar__nav-icon" />,
  },
];



const SidebarNavLink = ({ item, disabled }: { item: SidebarNavItem; disabled?: boolean; }) => {
  const t = useT();
  const folderTagMode = useFolderTagModeStore((state) => state.folderTagMode);
  const setFolderTagMode = useFolderTagModeStore((state) => state.setFolderTagMode);
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);
  const openExplorerTab = useWorkspaceTabsStore((state) => state.openExplorerTab);
  const navigate = useNavigate();
  const activeTab = activeTabId === null ? null : (tabs.find((tab) => tab.id === activeTabId) ?? null);
  const label = t[item.labelKey];
  const isDisabled = disabled ?? item.disabled ?? false;
  const isActive = item.folderTagMode !== undefined
    ? activeTab?.sectionKey === "library" && folderTagMode === item.folderTagMode
    : item.sectionKey !== undefined && activeTab?.sectionKey === item.sectionKey;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (isDisabled) return;
    item.onClick?.();
    if (item.id === "settings") return;
    if (item.folderTagMode) {
      navigate("/schedule");
      setFolderTagMode(item.folderTagMode);
      openExplorerTab({ title: "Library", explorerState: LIBRARY_EXPLORER_STATE });
      return;
    }
    if (item.sectionKey) {
      navigate("/schedule");
      openSectionTab(item.sectionKey);
    }
  };
  return (
    <HoverTooltip label={label} side="right" offset={0} className="w-8 min-w-8" arrowClassName="hidden">
      <button type="button" onClick={handleClick} disabled={isDisabled} className={cn("app-sidebar__nav-link", isActive && "is-active", isDisabled && "app-sidebar__nav-link--disabled")} aria-current={isActive ? "page" : undefined} aria-label={label}>
        <span className="app-sidebar__nav-icon-slot">{item.icon}</span>
      </button>
    </HoverTooltip>
  );
};
const Sidebar = ({ isLeftPanelCollapsed = false, onToggleLeftPanel, onOpenSettings }: SidebarProps) => {
  const t = useT();
  const { logout, loading } = useAuthSession();
  const openSearch = useSearchStore((state) => state.open);
  const mainNavItemsWithActions = mainNavItems.map((item) => ({
    ...item,
    onClick: () => {
      item.onClick?.();
      if (item.id === "calendar" && isLeftPanelCollapsed) {
        onToggleLeftPanel?.();
      }
      if (item.id === "explore") {
        openSearch();
      }
    },
  }));
  const footerItems: SidebarNavItem[] = [
    {
      id: "settings",
      labelKey: "sidebarSettings",
      icon: <SettingIcon className="app-sidebar__nav-icon" />,
      onClick: onOpenSettings,
    },
  ];
  const handleLogoutClick = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("[Sidebar] Logout failed:", error);
    }
  };
  return (
    <aside className="app-sidebar" aria-label={t.sidebarAriaLabel}>
      <div className="app-sidebar__top">
        {isLeftPanelCollapsed ? (
          <button type="button" className="app-sidebar__toggle app-sidebar__toggle--panel-collapsed" onClick={onToggleLeftPanel} aria-label={t.sidebarToggleOpen} aria-pressed={isLeftPanelCollapsed}>
            <SidebarOpenIcon className="app-sidebar__toggle-icon" />
          </button>
        ) : null}
        <nav className="app-sidebar__nav" aria-label={t.sidebarMainNavAriaLabel}>
          {mainNavItemsWithActions.map((item) => (
            <SidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
      <div className="app-sidebar__bottom">
        <HoverTooltip label={t.sidebarLogout} side="right" offset={0} className="w-8 min-w-8" arrowClassName="hidden">
          <button type="button" className={cn("app-sidebar__nav-link", loading && "app-sidebar__nav-link--disabled")} onClick={handleLogoutClick} disabled={loading} aria-label={t.sidebarLogout}>
            <span className="app-sidebar__nav-icon-slot">
              <LogOut className="app-sidebar__nav-icon" />
            </span>
          </button>
        </HoverTooltip>
        <nav className="app-sidebar__nav" aria-label={t.sidebarFooterNavAriaLabel}>
          {footerItems.map((item) => (
            <SidebarNavLink key={item.id} item={item} />
          ))}
        </nav>
      </div>
    </aside>
  );
};



export { Sidebar };
