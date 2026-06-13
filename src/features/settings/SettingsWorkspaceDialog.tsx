import "./SettingsWorkspaceDialog.css";
import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/dialog";
import { SettingsWorkspaceScreen } from "./SettingsWorkspaceScreen";



type SettingsWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};



const SettingsWorkspaceDialog = ({ open, onOpenChange }: SettingsWorkspaceDialogProps) => {
  const handleClose = () => onOpenChange(false);

  if (!open) return null;

  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <SettingsWorkspaceScreen />
    </DialogDesktopPanel>
  );
};



export { SettingsWorkspaceDialog };
