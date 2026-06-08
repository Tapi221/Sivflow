import { SidebarOpenIcon } from "@/chip/icons/icons.sidebar";
import { CalendarSidebarController } from "@/pane.desktop/leftpane/schedule/CalendarSidebarController";
import { MobileSidebarDrawer } from "./MobileSidebarDrawer";

const MOBILE_SCHEDULE_SIDEBAR_ID = "mobile-schedule-sidebar";
const MOBILE_SCHEDULE_SIDEBAR_OPEN_ICON_CLASS_NAME = "h-5 w-5 shrink-0 [transform:scaleX(-1)]";
const MOBILE_SCHEDULE_SIDEBAR_DRAWER_CONTENT_CLASS_NAME = "h-full min-h-0 w-full [&_.app-layered-directory]:!min-w-0 [&_.app-layered-directory]:!w-full";

const DEFAULT_MOBILE_SCHEDULE_SIDEBAR_OPEN_BUTTON_CLASS_NAME = "flex h-10 w-10 shrink-0 items-center justify-center bg-transparent text-[#111111] transition hover:text-[#111111] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d1d1d6]";

type MobileScheduleSidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
};

type MobileScheduleSidebarOpenButtonProps = {
  isOpen: boolean;
  onOpen: () => void;
  className?: string;
};

const MobileScheduleSidebarOpenButton = ({ isOpen, onOpen, className = DEFAULT_MOBILE_SCHEDULE_SIDEBAR_OPEN_BUTTON_CLASS_NAME }: MobileScheduleSidebarOpenButtonProps) => {
  return (
    <button type="button" className={className} onClick={onOpen} aria-label="サイドバーを開く" aria-controls={MOBILE_SCHEDULE_SIDEBAR_ID} aria-expanded={isOpen}>
      <SidebarOpenIcon className={MOBILE_SCHEDULE_SIDEBAR_OPEN_ICON_CLASS_NAME} />
    </button>
  );
};

const MobileScheduleSidebar = ({ isOpen, onClose, onOpenSettings }: MobileScheduleSidebarProps) => {
  return (
    <MobileSidebarDrawer id={MOBILE_SCHEDULE_SIDEBAR_ID} isOpen={isOpen} onClose={onClose}>
      <div className={MOBILE_SCHEDULE_SIDEBAR_DRAWER_CONTENT_CLASS_NAME}>
        <CalendarSidebarController onOpenSettings={onOpenSettings} onToggleLeftPanel={onClose} />
      </div>
    </MobileSidebarDrawer>
  );
};

export { MobileScheduleSidebar, MobileScheduleSidebarOpenButton, MOBILE_SCHEDULE_SIDEBAR_ID };
