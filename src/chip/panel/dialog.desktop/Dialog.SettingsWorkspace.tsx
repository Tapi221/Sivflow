import "@/features/settings/Dialog.Settings.css";
import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/DialogDesktopPanel";
import { SettingsWorkspaceRootScreen } from "@/features/settings/SettingsWorkspaceRootScreen";

type SettingsWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingsWorkspaceRootContent = SettingsWorkspaceRootScreen;

const SettingsWorkspaceDialog = ({ open, onOpenChange }: SettingsWorkspaceDialogProps) => {
  const handleClose = () => onOpenChange(false);
  if (!open) return null;
  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <SettingsWorkspaceRootContent></SettingsWorkspaceRootContent>
    </DialogDesktopPanel>
  );
};

export { SettingsWorkspaceDialog };
export type { SettingsWorkspaceDialogProps };
