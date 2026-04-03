import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers, FileEdit } from "@/ui/icons";

/**
 * カード作成方法を選択するダイアログ
 * @param {boolean} open ダイアログの表示状態
 * @param {function} onOpenChange 表示状態変更時のコールバック
 * @param {function} onSelectMode モード選択時のコールバック ('single' | 'continuous')
 */
const CreateCardSelectionDialog = ({ open, onOpenChange, onSelectMode }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>作成方法を選択</DialogTitle>
          <DialogDescription>
            カードの作成方法を選んでください
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 py-4">
          <button
            onClick={() => onSelectMode("continuous")}
            className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-primary-600 hover:bg-primary-50 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mr-4 group-hover:bg-primary-200 transition-colors">
              <Layers className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 group-hover:text-primary-700">
                モード連続作成
              </h3>
              <p className="text-sm text-slate-500">
                一問一答や4択など、形式を選んで連続で作成します
              </p>
            </div>
          </button>

          <button
            onClick={() => onSelectMode("single")}
            className="group flex items-center p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mr-4 group-hover:bg-slate-200 transition-colors">
              <FileEdit className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">個別作成</h3>
              <p className="text-sm text-slate-500">
                基本のエディタを使って1枚ずつ丁寧に作成します
              </p>
            </div>
          </button>
        </div>

        <DialogFooter className="sm:justify-start">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCardSelectionDialog;
