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
            h-[min(780px,calc(100vh-64px))]
            min-h-[560px]
            flex
            rounded-lg
            overflow-hidden
          "
        >
          <div className="w-[280px] shrink-0 bg-muted/30">
          </div>

          <div className="w-px bg-border" />
          <div className="flex-1 bg-background">
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SettingDialog };