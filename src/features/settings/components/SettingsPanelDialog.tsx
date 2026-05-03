import { Dialog, DialogContent } from "@/components/ui/dialog";

type SettingsPanelDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const panelStyle = {
  backgroundColor: "var(--app-sidebar-bg, #f6f6f6)",
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
        className="!w-[min(920px,calc(100vw-48px))] !max-w-none !gap-0 !overflow-hidden !border-[rgba(0,0,0,0.08)] !p-0 shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
        overlayClassName="bg-black/40"
        contentWrapperClassName="p-6"
        style={panelStyle}
      >
        <div
          className="w-full min-h-[560px] h-[min(680px,calc(100vh-80px))]"
          style={panelStyle}
        />
      </DialogContent>
    </Dialog>
  );
};

export { SettingsPanelDialog };
