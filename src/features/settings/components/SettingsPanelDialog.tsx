import { Dialog, DialogContent } from "@/components/ui/dialog";

type SettingsPanelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingsPanelDialog = ({
  open,
  onOpenChange,
}: SettingsPanelDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        surface="plain"
        accessibleTitle="設定"
        accessibleDescription="設定パネル"
        showCloseButton={false}
        className="ds-settings-panel-dialog !w-[min(920px,calc(100vw-48px))] !max-w-none !gap-0 !overflow-hidden !p-0"
        overlayClassName="bg-black/40"
        contentWrapperClassName="p-6"
      >
        <div className="ds-settings-panel-dialog__surface w-full min-h-[560px] h-[min(680px,calc(100vh-80px))]" />
      </DialogContent>
    </Dialog>
  );
};

export { SettingsPanelDialog };
