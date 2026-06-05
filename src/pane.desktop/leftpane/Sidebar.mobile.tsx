import { useState, type ReactNode } from "react";
import { CalendarIcon, ChevronDownIcon, GalleryIcon, HomeIcon, LibraryIcon, SettingIcon } from "@/chip/icons/icons.sidebar";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { cn } from "@/lib/utils";

type SidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  sectionKey?: "home" | "review" | "library" | "schedule" | "settings";
  onClick?: () => void;
};

type SidebarMobileProps = {
  onClose?: () => void;
  onOpenSettings?: () => void;
};

const mainNavItems: SidebarNavItem[] = [
  {
    id: "home",
    label: "Home",
    icon: <HomeIcon className="sidebar-nav-icon" />,
    sectionKey: "home",
  },
  {
    id: "library",
    label: "Library",
    icon: <LibraryIcon className="sidebar-nav-icon" />,
    sectionKey: "library",
  },
  {
    id: "calendar",
    label: "Calendar",
    icon: <CalendarIcon className="sidebar-nav-icon" />,
    sectionKey: "schedule",
  },
  {
    id: "explore",
    label: "探す",
    icon: <GalleryIcon className="sidebar-nav-icon" />,
  },
];

const SidebarMobile = ({ onClose, onOpenSettings }: SidebarMobileProps) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [selectedLibraryChild, setSelectedLibraryChild] = useState("pdf");

  const openSearch = useSearchStore((s) => s.open);
  const openSectionTab = useWorkspaceTabsStore((s) => s.openSectionTab);

  const handleClick = (item: SidebarNavItem) => {
    item.onClick?.();

    if (item.id === "library") {
      setIsLibraryOpen((v) => !v);
      openSectionTab("library");
      return;
    }

    if (item.id === "explore") {
      openSearch();
      onClose?.();
      return;
    }

    if (item.sectionKey) {
      openSectionTab(item.sectionKey);
      onClose?.();
    }
  };

  const openLibraryChild = (type: string) => {
    setSelectedLibraryChild(type);
    openSectionTab("library");
    onClose?.();
  };

  const openSettings = () => {
    onOpenSettings?.();
    openSectionTab("settings");
    onClose?.();
  };

  return (
    <aside className="sidebar sidebar--mobile">
      <nav className="sidebar-nav">
        {mainNavItems.map((item) => (
          <div key={item.id}>
            <button type="button" className="sidebar-nav-link" onClick={() => handleClick(item)}>
              <span className="sidebar-nav-icon-slot">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>

              {item.id === "library" && <ChevronDownIcon className={cn(isLibraryOpen && "is-open")} />}
            </button>

            {item.id === "library" && isLibraryOpen && (
              <div className="sidebar-library-children">
                {["pdf", "flashcards", "notes"].map((type) => (
                  <button type="button" key={type} className={cn(selectedLibraryChild === type && "is-active")} onClick={() => openLibraryChild(type)}>
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <button type="button" className="sidebar-nav-link" onClick={openSettings}>
        <span className="sidebar-nav-icon-slot">
          <SettingIcon className="sidebar-nav-icon" />
        </span>
        <span className="sidebar-nav-label">設定</span>
      </button>
    </aside>
  );
};

export { SidebarMobile };
export type { SidebarMobileProps };
