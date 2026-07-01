import "./sidebar.desktop.css";
import { memo } from "react";
import { useT } from "@shared/i18n/useT";
import { SidebarOpenIcon } from "@web-renderer/chip/icons/icons.sidebar";



type SidebarCollapsedToggleProps = {
  isVisible: boolean;
  onToggleLeftPanel: () => void;
};



const SidebarCollapsedToggleBase = ({ isVisible, onToggleLeftPanel }: SidebarCollapsedToggleProps) => {
  const t = useT();

  if (!isVisible) return null;

  return (
    <button type="button" className="app-sidebar-collapsed-toggle" onClick={onToggleLeftPanel} aria-label={t.sidebarToggleOpen} title={t.sidebarToggleOpen}>
      <SidebarOpenIcon className="app-sidebar-collapsed-toggle__icon" />
    </button>
  );
};



SidebarCollapsedToggleBase.displayName = "SidebarCollapsedToggleBase";
const SidebarCollapsedToggle = memo(SidebarCollapsedToggleBase);
SidebarCollapsedToggle.displayName = "SidebarCollapsedToggle";

export { SidebarCollapsedToggle };
