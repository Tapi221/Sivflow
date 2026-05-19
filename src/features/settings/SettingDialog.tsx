import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useSettingDialog } from "./hooks/useSettingDialog";
import { settingSections } from "./settingSections";
import SettingPane from "./SettingPane";

type SettingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const SettingDialog = ({ open, onOpenChange }: SettingDialogProps) => {
  const { selected, setSelected } = useSettingDialog();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="
          !w-[min(1100px,calc(100vw-32px))]
          !max-w-none
          !p-0
          !overflow-hidden
        "
      >
        <div
          className="
            flex
            h-[min(780px,calc(100vh-64px))]
            min-h-[560px]
          "
        >
          {/* sidebar */}
          <div className="w-[240px] shrink-0 bg-muted/30 flex flex-col p-3 gap-2">
            {settingSections.map((item) => (
              <button
                key={item.key}
                onClick={() => setSelected(item.key)}
                className={`text-left px-3 py-2 rounded-md transition ${
                  selected === item.key
                    ? "bg-muted font-medium"
                    : "hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* main content */}
          <div className="flex-1 bg-background p-4 overflow-auto">
            <SettingPane selected={selected} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SettingDialog };
