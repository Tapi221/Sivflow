import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import "./Sidebar.css";
import { SidebarNavIcon } from "./sidebarNavItem";
import { getSidebarNavItemClassName } from "./sidebarNavItem.utils";
import { SidebarSyncStatus } from "./SidebarSyncStatus";
import { NAV_SECTIONS, type NavItem } from "./sidebarNavigation";

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

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHomeOnlyMode =
    location.pathname.toLowerCase() === "/folders" &&
    new URLSearchParams(location.search).get("home") === "1";

  const handleOpenSettings = () => {
    const next = new URLSearchParams(location.search);
    next.set("settings", "true");
    next.set("settingsTab", "study");
    navigate({ search: `?${next.toString()}` });
  };

  const renderNavLink = ({ to, label, icon, disabled }: NavItem) => {
    if (disabled) {
      return (
        <button
          key={to}
          type="button"
          disabled
          aria-disabled="true"
          className={getSidebarNavItemClassName({
            className: "cursor-not-allowed opacity-45",
          })}
          onClick={(event) => {
            event.preventDefault();
          }}
        >
          <SidebarNavIcon>{icon}</SidebarNavIcon>
          <span className="sidebar__nav-label">{label}</span>
        </button>
      );
    }

    return (
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
        <span className="sidebar__nav-label">{label}</span>
      </NavLink>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <NavLink
          to="/folders"
          className="sidebar__workspace-link"
          aria-label="ホームに移動"
        />
      </div>

      <nav className="sidebar__nav" aria-label="メインナビゲーション">
        {NAV_SECTIONS.map(({ title, items }) => {
          return (
            <div key={title} className="sidebar__section">
              <div className="sidebar__section-items">
                {items.map(renderNavLink)}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <button
          type="button"
          className={getSidebarNavItemClassName({
            className: "sidebar__settings-btn",
          })}
          onClick={handleOpenSettings}
        >
          <SidebarNavIcon>
            <SettingsIcon />
          </SidebarNavIcon>
          <span className="sidebar__nav-label">設定</span>
        </button>

        <SidebarSyncStatus />
      </div>
    </aside>
  );
};


