import { cn } from "@/lib/utils";

type SidebarNavItemClassNameOptions = {
  isActive?: boolean;
  className?: string;
};

export const getSidebarNavItemClassName = ({
  isActive = false,
  className,
}: SidebarNavItemClassNameOptions = {}) => {
  return cn(
    "sidebar__nav-item",
    "ds-nav-action",
    isActive && "sidebar__nav-item--active",
    isActive && "ds-nav-action--active",
    className,
  );
};
