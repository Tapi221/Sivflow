import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { SidebarNavIcon } from "./sidebarNavItem";
import { getSidebarNavItemClassName } from "./sidebarNavItem.utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
};

const FolderIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 1.5H13.5A1 1 0 0 1 14.5 5V12.5A1 1 0 0 1 13.5 13.5H2.5A1 1 0 0 1 1.5 12.5V3.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const DictionaryIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M3 2.5H11.5A1.5 1.5 0 0 1 13 4V13.5H4.5A1.5 1.5 0 0 0 3 15V2.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M4.5 15V4A1.5 1.5 0 0 1 6 2.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 5.5H10.5M6.5 8H10.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const CalendarIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="3"
      width="13"
      height="11.5"
      rx="1"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M5 1.5V4.5M11 1.5V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const GalleryIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <rect
      x="1.5"
      y="1.5"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="9"
      y="1.5"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="1.5"
      y="9"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <rect
      x="9"
      y="9"
      width="5.5"
      height="5.5"
      rx="0.75"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

const DirectoryIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2 3.5H6M2 8H10M2 12.5H14"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="8" cy="3.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="12" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

const TrashIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M2.5 4.5H13.5L12.5 13.5H3.5L2.5 4.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M1 4.5H15M6 4.5V2.5H10V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M8 1.5V3M8 13V14.5M14.5 8H13M3 8H1.5M12.364 3.636L11.3 4.7M4.7 11.3L3.636 12.364M12.364 12.364L11.3 11.3M4.7 4.7L3.636 3.636"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { to: "/folders", label: "フォルダ", icon: <FolderIcon /> },
  { to: "/dictionary", label: "辞書", icon: <DictionaryIcon /> },
  { to: "/calendar", label: "カレンダー", icon: <CalendarIcon /> },
  { to: "/gallery", label: "ギャラリー", icon: <GalleryIcon /> },
  { to: "/trash", label: "ゴミ箱", icon: <TrashIcon /> },
  { to: "/directory", label: "ディレクトリ", icon: <DirectoryIcon /> },
];

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeOnlyMode =
    location.pathname.toLowerCase() === "/folders" &&
    new URLSearchParams(location.search).get("home") === "1";

  const handleOpenSettings = () => {
    const next = new URLSearchParams(location.search);
    next.set("settings", "true");
    next.set("settingsTab", "account");
    navigate({ search: `?${next.toString()}` });
  };

  return (
    <aside className="sidebar">
      <nav className="sidebar__nav" aria-label="メインナビゲーション">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              getSidebarNavItemClassName({
                isActive:
                  to === "/folders" ? isActive && !isHomeOnlyMode : isActive,
              })
            }
          >
            <SidebarNavIcon>{icon}</SidebarNavIcon>
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        <button
          className={getSidebarNavItemClassName({
            className: "sidebar__settings-btn",
          })}
          onClick={handleOpenSettings}
        >
          <SidebarNavIcon>
            <SettingsIcon />
          </SidebarNavIcon>
          設定
        </button>
      </div>
    </aside>
  );
};