import { Dialog, DialogContent } from "@/components/ui/dialog";

type SettingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingDialog = ({
  open,
  onOpenChange,
}: SettingDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        surface="plain"
        accessibleTitle="設定"
        accessibleDescription="設定パネル"
        showCloseButton={false}
        className="
          ds-settings-panel-dialog
          !w-[min(1100px,calc(100vw-32px))]
          !max-w-none
          !gap-0
          !overflow-hidden
          !p-0
          !rounded-lg
        "
        overlayClassName="bg-black/40"
        contentWrapperClassName="p-6"
      >
        <div
          className="
            ds-settings-panel-dialog__surface
            w-full
            min-h-[560px]
            h-[min(780px,calc(100vh-64px))]
            rounded-lg
          "
        />
      </DialogContent>
    </Dialog>
  );
};

export { SettingDialog };