import { DialogDesktopPanel } from "@/chip/panel/dialog.desktop/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const TestDialog = ({ open, onOpenChange }: Props) => {
  const handleClose = () => onOpenChange(false);
  if (!open) return null;
  return (
    <DialogDesktopPanel surfaceClassName="settings-workspace-dialog" ariaLabel="Settings" onClose={handleClose}>
      <div />
    </DialogDesktopPanel>
  );
};

export { TestDialog };
