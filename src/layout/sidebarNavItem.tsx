import React from "react";
import { cn } from "@/lib/utils";
import "./Sidebar.css";

type SidebarNavIconProps = {
  children: React.ReactNode;
  className?: string;
};

type SidebarNavItemClassNameOptions = {
  isActive?: boolean;
  className?: string;
};

export function getSidebarNavItemClassName({
  isActive = false,
  className,
}: SidebarNavItemClassNameOptions = {}) {
  return cn("sidebar__nav-item", isActive && "sidebar__nav-item--active", className);
}

export function SidebarNavIcon({ children, className }: SidebarNavIconProps) {
  return <span className={cn("sidebar__nav-icon", className)}>{children}</span>;
}
