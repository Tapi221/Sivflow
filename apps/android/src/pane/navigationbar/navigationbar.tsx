import "./navigationbar.css";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { GalleryIcon, HomeIcon, LibraryIcon, SettingIcon } from "@web-renderer/chip/icons/icons.sidebar";
import { cn } from "@web-renderer/lib/utils";
import type { CSSProperties, ReactNode } from "react";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import type { WorkspaceSidebarSection } from "@/pane.desktop/tab.desktopnative/Tab";



type NavigationBarItemId = "explore" | "library" | "home" | "settings";
type SidebarIconComponent = (props: { className?: string; }) => ReactNode;
type NavigationBarItem = {
  id: NavigationBarItemId;
  label: string;
  Icon: SidebarIconComponent;
  sectionKey?: WorkspaceSidebarSection;
};
type NavigationBarMobileProps = {
  activeItemId?: NavigationBarItemId;
  className?: string;
  onItemSelect?: (itemId: NavigationBarItemId) => void;
  onOpenSettings?: () => void;
};
type NavigationBarMobileStyle = CSSProperties & {
  "--mobile-navigation-bar-active-x": string;
};



const DEFAULT_ACTIVE_ITEM_ID: NavigationBarItemId = "home";
const NAVIGATION_BAR_ITEMS: readonly NavigationBarItem[] = [
  { id: "explore", label: "探す", Icon: GalleryIcon },
  { id: "library", label: "Library", Icon: LibraryIcon, sectionKey: "library" },
  { id: "home", label: "Home", Icon: HomeIcon, sectionKey: "home" },
  { id: "settings", label: "設定", Icon: SettingIcon, sectionKey: "settings" },
];



const getNavigationBarItemIndex = (itemId: NavigationBarItemId) => {
  const itemIndex = NAVIGATION_BAR_ITEMS.findIndex((item) => item.id === itemId);
  return itemIndex >= 0 ? itemIndex : NAVIGATION_BAR_ITEMS.findIndex((item) => item.id === DEFAULT_ACTIVE_ITEM_ID);
};
const getNavigationBarActiveX = (itemIndex: number) => `${((itemIndex + 0.5) / NAVIGATION_BAR_ITEMS.length) * 100}%`;



const NavigationBarMobileComponent = ({ activeItemId, className, onItemSelect, onOpenSettings }: NavigationBarMobileProps) => {
  const tabs = useWorkspaceTabsStore((state) => state.tabs);
  const activeTabId = useWorkspaceTabsStore((state) => state.activeTabId);
  const openSectionTab = useWorkspaceTabsStore((state) => state.openSectionTab);
  const openSearch = useSearchStore((state) => state.open);

  const activeTabSectionKey = useMemo(() => {
    if (activeTabId === null) return null;
    return tabs.find((tab) => tab.id === activeTabId)?.sectionKey ?? null;
  }, [activeTabId, tabs]);

  const workspaceActiveItemId = useMemo(() => NAVIGATION_BAR_ITEMS.find((item) => item.sectionKey === activeTabSectionKey)?.id ?? null, [activeTabSectionKey]);
  const [selectedItemId, setSelectedItemId] = useState<NavigationBarItemId>(activeItemId ?? workspaceActiveItemId ?? DEFAULT_ACTIVE_ITEM_ID);

  useEffect(() => {
    if (activeItemId) {
      setSelectedItemId(activeItemId);
      return;
    }
    if (workspaceActiveItemId) setSelectedItemId(workspaceActiveItemId);
  }, [activeItemId, workspaceActiveItemId]);

  const activeItemIndex = getNavigationBarItemIndex(selectedItemId);
  const activeItem = NAVIGATION_BAR_ITEMS[activeItemIndex] ?? NAVIGATION_BAR_ITEMS[getNavigationBarItemIndex(DEFAULT_ACTIVE_ITEM_ID)];
  const ActiveIcon = activeItem.Icon;
  const activeBarStyle = useMemo<NavigationBarMobileStyle>(() => ({ "--mobile-navigation-bar-active-x": getNavigationBarActiveX(activeItemIndex) }), [activeItemIndex]);

  const handleSelect = useCallback((item: NavigationBarItem) => {
    setSelectedItemId(item.id);
    onItemSelect?.(item.id);
    if (item.id === "explore") {
      openSearch();
      return;
    }
    if (item.id === "settings") onOpenSettings?.();
    if (item.sectionKey) openSectionTab(item.sectionKey);
  }, [onItemSelect, onOpenSettings, openSearch, openSectionTab]);

  return (
    <nav className={cn("mobile-navigation-bar", className)} aria-label="モバイルナビゲーション">
      <div className="mobile-navigation-bar__surface" style={activeBarStyle}>
        <span className="mobile-navigation-bar__active-indicator" aria-hidden="true">
          <ActiveIcon className="mobile-navigation-bar__icon" />
        </span>
        {NAVIGATION_BAR_ITEMS.map((item) => {
          const isActive = item.id === selectedItemId;
          const Icon = item.Icon;
          return (
            <button key={item.id} type="button" className={cn("mobile-navigation-bar__button", isActive && "is-active")} onClick={() => handleSelect(item)} aria-label={item.label} aria-pressed={isActive}>
              <span className="mobile-navigation-bar__button-icon" aria-hidden="true">
                <Icon className="mobile-navigation-bar__icon" />
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};



const NavigationBarMobile = memo(NavigationBarMobileComponent);
NavigationBarMobile.displayName = "NavigationBarMobile";

export { NavigationBarMobile };


export type { NavigationBarItemId, NavigationBarMobileProps };
