import "@/features/settings/SettingsWorkspaceDialog.css";
import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/dialog";
import { SettingsWorkspaceRootScreen } from "@/features/settings/SettingsWorkspaceRootScreen";

type SettingsWorkspaceRootPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingsWorkspaceRootPanel = ({ open, onOpenChange }: SettingsWorkspaceRootPanelProps) => {
  const handleClose = () => onOpenChange(false);
  if (!open) return null;
  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <SettingsWorkspaceRootScreen />
    </DialogDesktopPanel>
  );
};

export { SettingsWorkspaceRootPanel };
export type { SettingsWorkspaceRootPanelProps };
