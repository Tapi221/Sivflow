import { ReactNode, useState } from "react";
import { CalendarIcon, ChevronDownIcon, GalleryIcon, HomeIcon, LibraryIcon, SettingIcon } from "@/chip/icons/icons.sidebar";
import { useSearchStore } from "@/features/search/store/useSearchStore";
import { useWorkspaceTabsStore } from "@/pane/tab.desktopnative/hooks/useTabsStore";
import { cn } from "@/lib/utils";

/* ---------------- types ---------------- */

type SidebarNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  sectionKey?: "home" | "review" | "library" | "schedule" | "settings";
  onClick?: () => void;
};

/* ---------------- data ---------------- */

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
    label: "Schedule",
    icon: <CalendarIcon className="sidebar-nav-icon" />,
    sectionKey: "schedule",
  },
  {
    id: "explore",
    label: "探す",
    icon: <GalleryIcon className="sidebar-nav-icon" />,
  },
];

/* ---------------- component ---------------- */

export const SidebarMobile = ({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [selectedLibraryChild, setSelectedLibraryChild] = useState("pdf");

  const openSearch = useSearchStore((s) => s.open);
  const openSectionTab = useWorkspaceTabsStore((s) => s.openSectionTab);

  const handleClick = (item: SidebarNavItem) => {
    item.onClick?.();

    if (item.id === "library") {
      setIsLibraryOpen((v) => !v);
    }

    if (item.id === "explore") {
      openSearch();
    }

    if (item.sectionKey) {
      openSectionTab(item.sectionKey);
    }
  };

  const openLibraryChild = (type: string) => {
    setSelectedLibraryChild(type);
    openSectionTab("library");
  };

  const openSettings = () => {
    onOpenSettings?.();
    openSectionTab("settings");
  };

  return (
    <aside className="sidebar sidebar--mobile">
      <nav className="sidebar-nav">
        {mainNavItems.map((item) => (
          <div key={item.id}>
            <button
              className="sidebar-nav-link"
              onClick={() => handleClick(item)}
            >
              <span className="sidebar-nav-icon-slot">{item.icon}</span>
              <span className="sidebar-nav-label">{item.label}</span>

              {item.id === "library" && (
                <ChevronDownIcon className={cn(isLibraryOpen && "is-open")} />
              )}
            </button>

            {item.id === "library" && isLibraryOpen && (
              <div className="sidebar-library-children">
                {["pdf", "flashcards", "notes"].map((type) => (
                  <button
                    key={type}
                    className={cn(selectedLibraryChild === type && "is-active")}
                    onClick={() => openLibraryChild(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <button className="sidebar-nav-link" onClick={openSettings}>
        <span className="sidebar-nav-icon-slot">
          <SettingIcon className="sidebar-nav-icon" />
        </span>
        <span className="sidebar-nav-label">設定</span>
      </button>
    </aside>
  );
};
