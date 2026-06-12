import "./SettingsWorkspaceDialog.css";
import type { MouseEvent as ReactMouseEvent } from "react";
import { SettingsWorkspaceScreen } from "./SettingsWorkspaceScreen";



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
    <div className="app-modal-backdrop" onMouseDown={handleBackdropMouseDown}>
      <section className="app-modal-surface settings-workspace-dialog" aria-label="Settings">
        <SettingsWorkspaceScreen />
      </section>
    </div>
  );
};



export { SettingsWorkspaceDialog };
