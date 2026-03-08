import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import "./Sidebar.css";

type NavItem = {
  to: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/folders", label: "フォルダ" },
  { to: "/calendar", label: "カレンダー" },
  { to: "/gallery", label: "ギャラリー" },
  { to: "/trash", label: "ゴミ箱" },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-name">Manifolia.</span>
      </div>

      <nav className="sidebar__nav" aria-label="メインナビゲーション">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              ["sidebar__nav-item", isActive ? "sidebar__nav-item--active" : ""]
                .filter(Boolean)
                .join(" ")
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
