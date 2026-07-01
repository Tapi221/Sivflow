import { cn } from "@web-renderer/lib/utils";



type Params = {
  isFoldersRoute: boolean;
  isScrollLocked: boolean;
  isSidebarCollapsed: boolean;
  isRightSidebarOpen: boolean;
};



const buildAppLayoutClassName = ({ isFoldersRoute, isScrollLocked, isSidebarCollapsed, isRightSidebarOpen }: Params) => {
  return cn("app-layout", isFoldersRoute && "app-layout--folders", isScrollLocked && "app-layout--scroll-locked", isSidebarCollapsed && "app-layout--sidebar-collapsed", isRightSidebarOpen && "app-layout--right-sidebar-open");
};



export { buildAppLayoutClassName };
