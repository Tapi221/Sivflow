import { SidebarOpenIcon } from "@web-renderer/chip/icons/icons.sidebar";
import { CalendarSidebarController } from "@/pane.desktop/leftpane/schedule/CalendarSidebarController";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";



type MobileCalendarSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
};
type MobileCalendarSidebarOpenButtonProps = {
  isOpen: boolean;
  onOpen: () => void;
  className?: string;
};



const MOBILE_CALENDAR_SIDEBAR_ID = "mobile-calendar-sidebar";
const MOBILE_CALENDAR_SIDEBAR_OPEN_ICON_CLASS_NAME = "h-5 w-5 shrink-0 [transform:scaleX(-1)]";
const MOBILE_CALENDAR_SIDEBAR_DRAWER_CONTENT_CLASS_NAME = "h-full min-h-0 w-full [&_.app-layered-directory]:!min-w-0 [&_.app-layered-directory]:!w-full";
const DEFAULT_MOBILE_CALENDAR_SIDEBAR_OPEN_BUTTON_CLASS_NAME = "flex h-10 w-10 shrink-0 items-center justify-center bg-transparent text-neutral-950 transition hover:text-neutral-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]";



const MobileCalendarSidebarOpenButton = ({ isOpen, onOpen, className = DEFAULT_MOBILE_CALENDAR_SIDEBAR_OPEN_BUTTON_CLASS_NAME }: MobileCalendarSidebarOpenButtonProps) => {
  if (isOpen) return null;

  return (
    <button type="button" className={className} onClick={onOpen} aria-label="サイドバーを開く" aria-controls={MOBILE_CALENDAR_SIDEBAR_ID} aria-expanded={isOpen}>
      <SidebarOpenIcon className={MOBILE_CALENDAR_SIDEBAR_OPEN_ICON_CLASS_NAME} />
    </button>
  );
};
const MobileCalendarSidebar = ({ isOpen, onClose, onOpenSettings }: MobileCalendarSidebarProps) => {
  return (
    <MobileSidebarDrawer id={MOBILE_CALENDAR_SIDEBAR_ID} isOpen={isOpen} onClose={onClose}>
      <div className={MOBILE_CALENDAR_SIDEBAR_DRAWER_CONTENT_CLASS_NAME}>
        <CalendarSidebarController onOpenSettings={onOpenSettings} onToggleLeftPanel={onClose} />
      </div>
    </MobileSidebarDrawer>
  );
};



export { MobileCalendarSidebar, MobileCalendarSidebarOpenButton, MOBILE_CALENDAR_SIDEBAR_ID };
