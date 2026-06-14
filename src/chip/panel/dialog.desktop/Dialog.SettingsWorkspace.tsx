import "@/features/settings/SettingsWorkspaceDialog.css";
import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/dialog";
import { SettingsThemeColorControl } from "@/features/settings/SettingsThemeColorControl";
import { SettingsWorkspaceScreen } from "@/features/settings/SettingsWorkspaceScreen";

type SettingsWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingsWorkspaceDialog = ({ open, onOpenChange }: SettingsWorkspaceDialogProps) => {
  const handleClose = () => onOpenChange(false);
  if (!open) return null;
  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <SettingsThemeColorControl />
      <SettingsWorkspaceScreen />
    </DialogDesktopPanel>
  );
};

export { SettingsWorkspaceDialog };
export type { SettingsWorkspaceDialogProps };
