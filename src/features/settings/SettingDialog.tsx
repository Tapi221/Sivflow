import { Dialog, DialogContent } from "@/components/ui/dialog";

type SettingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingDialog = ({ open, onOpenChange }: SettingDialogProps) => {
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
          {/* sidebar */}
          <div className="w-[240px] shrink-0 bg-muted/30" />

          {/* separator (grid line tone match) */}
          <div className="w-0 border-l border-[#eef0f3]" />

          {/* main content */}
          <div className="flex-1 bg-background" />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SettingDialog };
