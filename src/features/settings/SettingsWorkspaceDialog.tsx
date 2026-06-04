import { type MouseEvent as ReactMouseEvent } from "react";
import { X } from "@/ui/icons";
import { SettingsWorkspaceScreen } from "./SettingsWorkspaceScreen";
import "./SettingsWorkspaceDialog.css";

type SettingsWorkspaceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingsWorkspaceDialog = ({ open, onOpenChange }: SettingsWorkspaceDialogProps) => {
  const handleClose = () => onOpenChange(false);
  const handleBackdropMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) handleClose();
  };

  if (!open) return null;

  return (
    <div className="settings-workspace-dialog__backdrop" onMouseDown={handleBackdropMouseDown}>
      <section className="settings-workspace-dialog" aria-label="Settings">
        <button type="button" className="settings-workspace-dialog__close" aria-label="設定を閉じる" onClick={handleClose}>
          <X size={16} />
        </button>
        <SettingsWorkspaceScreen />
      </section>
    </div>
  );
};

export { SettingsWorkspaceDialog };
