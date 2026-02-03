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
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            フォルダを削除しますか？
          </AlertDialogTitle>
          <div className="space-y-4">
            <AlertDialogDescription>
              <span className="font-semibold text-gray-900">「{folder?.folderName || folder?.folder_name || '(名称未設定)'}」</span>
              をごみ箱に移動します。
            </AlertDialogDescription>
            {(cardCount > 0 || subfolderCount > 0) && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
                <p className="font-medium">以下の内容も一緒に削除されます：</p>
                <ul className="mt-1 text-sm list-disc list-inside">
                  {subfolderCount > 0 && <li>サブフォルダ: {subfolderCount}件</li>}
                  {cardCount > 0 && <li>カード: {cardCount}件</li>}
                </ul>
              </div>
            )}
            <p className="text-sm text-gray-500">
              ※ごみ箱から復元できます
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? '削除中...' : '削除する'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
