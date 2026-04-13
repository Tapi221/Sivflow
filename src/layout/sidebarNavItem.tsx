import React from "react";
import "./Sidebar.css";

type SidebarNavIconProps = {
  children: React.ReactNode;
  className?: string;
};

export const SidebarNavIcon = ({
  children,
  className,
}: SidebarNavIconProps) => {
  const resolvedClassName = className
    ? `sidebar__nav-icon ds-nav-action__icon ${className}`
    : "sidebar__nav-icon ds-nav-action__icon";

  return <span className={resolvedClassName}>{children}</span>;
};
