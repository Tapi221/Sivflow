import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  getLocalDb,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
} from '@/services/localDB';
import { snapshotService } from '@/services/SnapshotService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { Label } from '@/Components/ui/label';
import { AlertTriangle, Folder, Loader2, CheckCircle } from 'lucide-react';
import Download from 'lucide-react/dist/esm/icons/download';
import Database from 'lucide-react/dist/esm/icons/database';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const { currentUser } = useAuth();
  const [exportType, setExportType] = useState<'all' | 'folder'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportComplete, setExportComplete] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState(getLocalDBRuntimeStatus());

  useEffect(() => {
    return subscribeLocalDBRuntimeStatus(setRuntimeStatus);
  }, []);

  const isFallbackMode = runtimeStatus.mode === 'fallback';

  // フォルダ一覧を取得
  const folders = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const db = await getLocalDb();
      const allFolders = await db.getAllFolders();
      return allFolders.filter(f => !f.isDeleted);
    },
    [currentUser],
    []
  );

  const handleExport = async () => {
    if (!currentUser || isFallbackMode) return;
    
    setIsExporting(true);
    setExportComplete(false);
    
    try {
      if (exportType === 'all') {
        await snapshotService.exportToFile(currentUser.uid);
      } else if (selectedFolderId) {
        await snapshotService.exportFolder(currentUser.uid, selectedFolderId);
      }
      setExportComplete(true);
      
      // 3秒後にダイアログを閉じる
      setTimeout(() => {
        onOpenChange(false);
        setExportComplete(false);
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const selectedFolder = folders?.find(f => f.id === selectedFolderId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary-600" />
            データエクスポート
          </DialogTitle>
          <DialogDescription>
            カードとフォルダのデータをJSONファイルとしてエクスポートします。
            このファイルはバックアップとして保存したり、別のデバイスにインポートできます。
          </DialogDescription>
        </DialogHeader>

        {exportComplete ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-gray-900">エクスポート完了！</p>
            <p className="text-sm text-gray-500 mt-1">ファイルがダウンロードされました</p>
          </div>
        ) : (
          <>
            <div className="py-4">
              {isFallbackMode && (
                <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    ローカル保存が無効なため、このセッションではエクスポートできません
                  </div>
                </div>
              )}

              <RadioGroup
                value={exportType}
                onValueChange={(value) => setExportType(value as 'all' | 'folder')}
                className="space-y-3"
                disabled={isFallbackMode}
              >
                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Database className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">すべてのデータ</div>
                      <div className="text-sm text-gray-500">
                        全フォルダ・全カードをエクスポート
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="folder" id="folder" />
                  <Label htmlFor="folder" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Folder className="w-5 h-5 text-gray-500" />
                    <div>
                      <div className="font-medium">フォルダを選択</div>
                      <div className="text-sm text-gray-500">
                        特定のフォルダのみエクスポート
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {exportType === 'folder' && (
                <div className="mt-4 pl-8">
                  <Label className="text-sm text-gray-600 mb-2 block">
                    エクスポートするフォルダを選択:
                  </Label>
                  <select
                    title="エクスポート対象フォルダを選択"
                    value={selectedFolderId || ''}
                    onChange={(e) => setSelectedFolderId(e.target.value || null)}
                    className="w-full p-2 border rounded-lg text-sm"
                    disabled={isFallbackMode}
                  >
                    <option value="">選択してください</option>
                    {folders?.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.folderName || folder.folder_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
              <p className="text-amber-800">
                💡 <strong>ヒント:</strong> 定期的にエクスポートしてバックアップを取ることをお勧めします。
                エクスポートしたファイルは安全な場所に保存してください。
              </p>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            キャンセル
          </Button>
          {!exportComplete && (
            <Button
              onClick={handleExport}
              disabled={isFallbackMode || isExporting || (exportType === 'folder' && !selectedFolderId)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  エクスポート
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
