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
      <DialogContent className="p-0 overflow-hidden flex">
        <div className="w-[240px] p-3">
          {settingSections.map((item) => (
            <button
              key={item.key}
              onClick={() => setSelected(item.key)}
              className="block w-full text-left p-2 rounded"
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1">
          <SettingPane selected={selected} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { SettingDialog };