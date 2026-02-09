import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/Components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

export default function DeleteFolderDialog({ 
  open, 
  onOpenChange, 
  folder,
  cardCount,
  subfolderCount,
  onConfirm 
}) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleConfirm = async () => {
    setIsLoading(true);
    await onConfirm(folder);
    setIsLoading(false);
    onOpenChange(false);
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl md:rounded-xl p-5 md:p-6 gap-6 shadow-xl border-none">
        <AlertDialogHeader className="space-y-4">
          <AlertDialogTitle className="flex items-center gap-3 text-xl font-bold text-slate-800">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-500" />
            </div>
            フォルダを削除しますか？
          </AlertDialogTitle>
          <div className="space-y-5">
            <AlertDialogDescription className="text-slate-600 font-medium leading-relaxed">
              <span className="font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">「{folder?.folderName || folder?.folder_name || '(名称未設定)'}」</span>
              をごみ箱に移動します。
            </AlertDialogDescription>
            
            {(cardCount > 0 || subfolderCount > 0) && (
              <div className="bg-[#FFFBF0] border border-amber-100 rounded-2xl p-4 text-amber-900 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  以下の内容も一緒に削除されます：
                </p>
                <ul className="space-y-1 ml-3.5">
                  {subfolderCount > 0 && (
                    <li className="text-xs font-bold flex items-center gap-2 text-amber-800/80">
                      サブフォルダ: <span className="text-amber-600">{subfolderCount}件</span>
                    </li>
                  )}
                  {cardCount > 0 && (
                    <li className="text-xs font-bold flex items-center gap-2 text-amber-800/80">
                      カード: <span className="text-amber-600">{cardCount}件</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
            
            <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5 px-1">
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              ごみ箱からいつでも復元できます
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row gap-3 mt-2">
          <AlertDialogCancel 
            disabled={isLoading}
            className="flex-1 rounded-xl h-11 font-bold text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-600 transition-all border-2"
          >
            キャンセル
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1 rounded-xl h-11 font-bold bg-[#E11D48] hover:bg-[#BE123C] text-white shadow-soft transition-all border-none"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                削除中...
              </div>
            ) : '削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
