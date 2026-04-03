import { cn } from "@/lib/utils";

type SidebarNavItemClassNameOptions = {
  isActive?: boolean;
  className?: string;
};

export function getSidebarNavItemClassName({
  isActive = false,
  className,
}: SidebarNavItemClassNameOptions = {}) {
  return cn(
    "sidebar__nav-item",
    isActive && "sidebar__nav-item--active",
    className
  );
}
