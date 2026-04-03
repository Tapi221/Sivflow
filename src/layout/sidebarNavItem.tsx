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
    ? `sidebar__nav-icon ${className}`
    : "sidebar__nav-icon";

  return <span className={resolvedClassName}>{children}</span>;
};
