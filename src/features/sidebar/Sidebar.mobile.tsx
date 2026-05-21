import { ReactNode, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  CalendarIcon,
  ChevronDownIcon,
  ExploreIcon,
  GearIcon,
  HomeIcon,
  InboxIcon,
  LibraryIcon,
} from "../../components/icons/sidebar.icons";

import { useSchedulePaneStore } from "@/features/calendar/header/useSchedulePaneStore";
import { useGlobalSearchStore } from "@/features/global-search/store/useGlobalSearchStore";
import { useWorkspaceTabsStore } from "@/features/tab/hooks/useTabsStore";

import { cn } from "@/lib/utils";

/* ---------------- types ---------------- */

type SidebarNavItem = {
  id: string;
  label: string;
  to?: string;
  icon: ReactNode;
  sectionKey?: "home" | "review" | "library" | "schedule";
  onClick?: () => void;
};

/* ---------------- data ---------------- */

const mainNavItems: SidebarNavItem[] = [
  {
    id: "home",
    label: "Home",
    to: "/folders?home=1",
    icon: <HomeIcon className="sidebar-nav-icon" />,
    sectionKey: "home",
  },
  {
    id: "review",
    label: "Review",
    icon: <InboxIcon className="sidebar-nav-icon" />,
  },
  {
    id: "library",
    label: "Library",
    to: "/folders?view=section-list&libraryType=pdf",
    icon: <LibraryIcon className="sidebar-nav-icon" />,
    sectionKey: "library",
  },
  {
    id: "calendar",
    label: "Schedule",
    to: "/schedule",
    icon: <CalendarIcon className="sidebar-nav-icon" />,
    sectionKey: "schedule",
  },
  {
    id: "explore",
    label: "探す",
    icon: <ExploreIcon className="sidebar-nav-icon" />,
  },
];

/* ---------------- component ---------------- */

export const SidebarMobile = ({
  onOpenSettings,
}: {
  onOpenSettings?: () => void;
}) => {
  const navigate = useNavigate();
  const { search } = useLocation();

  const [isLibraryOpen, setIsLibraryOpen] = useState(true);

  const closeCalendar = useSchedulePaneStore((s) => s.close);
  const openGlobalSearch = useGlobalSearchStore((s) => s.open);
  const openSectionTab = useWorkspaceTabsStore((s) => s.openSectionTab);

  const selectedLibraryChild = new URLSearchParams(search).get("libraryType");

  const handleClick = (item: SidebarNavItem) => {
    closeCalendar();
    item.onClick?.();

    if (item.id === "library") {
      setIsLibraryOpen((v) => !v);
    }

    if (item.id === "explore") {
      openGlobalSearch();
    }

    if (item.sectionKey) {
      openSectionTab(item.sectionKey);
    }

    if (item.to) {
      navigate(item.to);
    }
  };

  const openLibraryChild = (type: string) => {
    closeCalendar();
    openSectionTab("library");
    navigate(`/folders?view=section-list&libraryType=${type}`);
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

      <button className="sidebar-nav-link" onClick={onOpenSettings}>
        <span className="sidebar-nav-icon-slot">
          <GearIcon className="sidebar-nav-icon" />
        </span>
        <span className="sidebar-nav-label">設定</span>
      </button>
    </aside>
  );
};