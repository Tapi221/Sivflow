import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ImportFormat = "xlsx" | "mfdeck" | "mfcard";

type ImportFormatDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (format: ImportFormat) => void;
};

export const ImportFormatDialog = ({
  open,
  onOpenChange,
  onSelect,
}: ImportFormatDialogProps) => {
  const handleSelect = (format: ImportFormat) => {
    onOpenChange(false);
    onSelect(format);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>インポート形式を選択</DialogTitle>
          <DialogDescription>
            XLSX テンプレート、MFDeck、MFCard のいずれかを選択してください。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={() => handleSelect("xlsx")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-bold text-slate-800">XLSX</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              blocks シートのテンプレートからカードを一括作成します。
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelect("mfdeck")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-bold text-slate-800">MFDeck</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              .mfdeck のカードセットを取り込みます。共有・バックアップ用です。
            </p>
          </button>

          <button
            type="button"
            onClick={() => handleSelect("mfcard")}
            className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300 hover:bg-slate-50"
          >
            <p className="text-sm font-bold text-slate-800">MFCard</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              .mfcard の単体カードを取り込みます。1枚だけ共有する用途です。
            </p>
          </button>
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
