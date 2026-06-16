import "@/features/settings/Dialog.Settings.css";
import { DialogDesktopPanel } from "./DialogDesktopPanel";
import { SettingsWorkspaceRootScreen } from "@/features/settings/SettingsWorkspaceRootScreen";



type SettingsWorkspaceRootPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};



const SettingsWorkspaceRootContent = SettingsWorkspaceRootScreen;



const SettingsWorkspaceRootPanel = ({ open, onOpenChange }: SettingsWorkspaceRootPanelProps) => {
  const handleClose = () => onOpenChange(false);
  if (!open) return null;
  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <SettingsWorkspaceRootContent></SettingsWorkspaceRootContent>
    </DialogDesktopPanel>
  );
};



export { SettingsWorkspaceRootPanel };


export type { SettingsWorkspaceRootPanelProps };
