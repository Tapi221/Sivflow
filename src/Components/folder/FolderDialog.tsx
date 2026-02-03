import React, { useState, useEffect } from 'react';
import { firestoreDb } from '@/services/firebase';
import { useToast } from '@/contexts/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Cloud, CloudOff } from 'lucide-react';

export default function FolderDialog({ 
  open, 
  onOpenChange, 
  folder, 
  parentFolderId,
  onSave 
}: any) {
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#FF6B6B');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { error: toastError } = useToast();
  
  useEffect(() => {
    if (open) {
      setFolderName(folder?.folderName || folder?.folder_name || '');
      setFolderColor(folder?.folderColor || '#FF6B6B');
      setCloudSyncEnabled(folder?.cloudSyncEnabled ?? true);
    }
  }, [open, folder]);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;
    // Guard: ensure Firestore is initialized before proceeding.
    if (typeof firestoreDb === 'undefined' || firestoreDb == null) {
      console.error('[FolderDialog] Firestore is not initialized. Aborting save.');
      // Do not throw; ensure UI does not remain in "saving" state.
      try { toastError?.('システムエラー: データベースが初期化されていません'); } catch (e) {}
      return;
    }

    setIsLoading(true);
    const parentId = folder?.parentFolderId ?? folder?.parent_folder_id ?? parentFolderId ?? null;
    const isSilent = folder?.isSilent ?? folder?.is_silent ?? false;
    await onSave({
      folderName: folderName.trim(),
      folder_name: folderName.trim(),
      folderColor,
      cloudSyncEnabled,
      isSilent,
      parentFolderId: parentId,
      parent_folder_id: parentId
    }, folder?.id ?? folder?.folderId);
    setIsLoading(false);
    onOpenChange(false);
  };
  
  const isEdit = !!folder;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full sm:max-w-md rounded-2xl md:rounded-xl p-5 md:p-6 gap-5 md:gap-6">
        <DialogHeader className="mb-0">
          <DialogTitle className="text-lg md:text-xl font-bold text-center sm:text-left">
            {isEdit ? 'フォルダ名を変更' : '新規フォルダ作成'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="folderName" className="text-sm font-bold text-slate-700">フォルダ名</Label>
            <Input
              id="folderName"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="例: 英単語, 数学I, 資格試験"
              autoFocus
              className="h-11 md:h-10 text-[16px] md:text-sm rounded-xl border-slate-200 focus:border-primary-600 focus:ring-primary-600"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">クラウド同期</Label>
            <div className="flex items-center justify-between p-3 md:p-4 bg-slate-50 border border-slate-100 rounded-xl transition-colors hover:border-slate-200">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${cloudSyncEnabled ? 'bg-primary-600/10' : 'bg-slate-100'}`}>
                  {cloudSyncEnabled ? (
                    <Cloud className="w-5 h-5 text-primary-600" />
                  ) : (
                    <CloudOff className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-slate-700">
                    {cloudSyncEnabled ? '同期有効' : '同期無効'}
                  </p>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium leading-tight">
                    {cloudSyncEnabled 
                      ? '他の端末と自動同期します'
                      : 'この端末のみに保存します'}
                  </p>
                </div>
              </div>
              <Switch
                checked={cloudSyncEnabled}
                onCheckedChange={setCloudSyncEnabled}
              />
            </div>
          </div>
          
          <DialogFooter className="flex flex-row-reverse sm:flex-row gap-3 sm:gap-2 mt-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 sm:flex-none h-11 md:h-10 rounded-xl font-bold text-slate-500 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-600"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={!folderName.trim() || isLoading}
              className="flex-1 sm:flex-none h-11 md:h-10 rounded-xl font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-soft hover:shadow-lg transition-all"
            >
              {isLoading ? '保存中...' : (isEdit ? '更新する' : '作成する')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}