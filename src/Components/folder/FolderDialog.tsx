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
import {
  Folder,
  BookOpen,
  Home,
  Settings,
  FileText,
  Zap,
  ChevronRight,
  Plus,
  Check,
  X,
  Edit,
  Trash2,
} from 'lucide-react';

// アイコンオプション
const iconOptions = [
  { name: 'Folder', Icon: Folder, label: 'フォルダ' },
  { name: 'BookOpen', Icon: BookOpen, label: '本' },
  { name: 'Home', Icon: Home, label: 'ホーム' },
  { name: 'Settings', Icon: Settings, label: '設定' },
  { name: 'FileText', Icon: FileText, label: 'ドキュメント' },
  { name: 'Zap', Icon: Zap, label: '稲妻' },
  { name: 'ChevronRight', Icon: ChevronRight, label: '矢印' },
  { name: 'Plus', Icon: Plus, label: 'プラス' },
  { name: 'Check', Icon: Check, label: 'チェック' },
  { name: 'X', Icon: X, label: 'バツ' },
  { name: 'Edit', Icon: Edit, label: '編集' },
  { name: 'Trash2', Icon: Trash2, label: 'ゴミ箱' },
];

export default function FolderDialog({
  open,
  onOpenChange,
  folder,
  parentFolderId,
  onSave,
}: any) {
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('#FF6B6B');
  const [folderIcon, setFolderIcon] = useState('Folder');
  const [cloudSyncEnabled, setCloudSyncEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { error: toastError } = useToast();

  const isEdit = !!folder;

  useEffect(() => {
    if (open) {
      setFolderName(folder?.folderName || folder?.folder_name || '');
      setFolderColor(folder?.folderColor || '#FF6B6B');
      setFolderIcon(folder?.folderIcon || 'Folder');
      setCloudSyncEnabled(folder?.cloudSyncEnabled ?? true);
    }
  }, [open, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    if (!firestoreDb) {
      toastError?.('システムエラー: データベースが初期化されていません');
      return;
    }

    setIsLoading(true);
    try {
      const parentId =
        folder?.parentFolderId ??
        folder?.parent_folder_id ??
        parentFolderId ??
        null;

      await onSave(
        {
          folderName: folderName.trim(),
          folder_name: folderName.trim(),
          folderColor,
          folderIcon,
          cloudSyncEnabled,
          isSilent: folder?.isSilent ?? folder?.is_silent ?? false,
          parentFolderId: parentId,
          parent_folder_id: parentId,
        },
        folder?.id ?? folder?.folderId
      );

      onOpenChange(false);
    } catch (error: any) {
      toastError?.(`保存に失敗しました: ${error?.message ?? '不明なエラー'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // モバイルキーボード対応
  const [viewportOffset, setViewportOffset] = useState(0);

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const diff = window.innerHeight - window.visualViewport!.height;
      if (diff > 150 && window.innerWidth < 768) {
        setViewportOffset(diff * 0.85);
      } else {
        setViewportOffset(0);
      }
    };

    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('scroll', handleResize);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:max-w-md rounded-2xl p-5 gap-6"
        style={{
          transform: `translate(-50%, calc(-50% - ${viewportOffset}px))`,
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? 'フォルダ名を変更' : '新規フォルダ作成'}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="space-y-6"
        >
          {/* Chrome / パスワードマネージャー対策用ダミー */}
          <input hidden type="text" name="fake_user" autoComplete="username" />
          <input hidden type="password" name="fake_pass" autoComplete="new-password" />

          <div className="space-y-2">
            <Label
              htmlFor="__new_folder_name"
              className="text-sm font-bold text-slate-700"
            >
              フォルダ名
            </Label>

            <Input
              id="__new_folder_name"
              name="__new_folder_name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="例: 英単語, 数学I, 資格試験"
              autoFocus
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="h-11 text-[16px] rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold text-slate-700">アイコン</Label>
            <div className="grid grid-cols-5 gap-2">
              {iconOptions.map(({ name, Icon, label }) => (
                <button
                  key={name}
                  type="button"
                  aria-label={label}
                  onClick={() => setFolderIcon(name)}
                  className={`flex items-center justify-center h-12 rounded-lg border-2 transition
                    ${
                      folderIcon === name
                        ? 'border-primary-600 bg-primary-50 text-primary-600'
                        : 'border-slate-200 text-slate-400 hover:text-slate-600'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={!folderName.trim() || isLoading}
              className="w-full h-12 rounded-xl font-bold"
            >
              {isLoading ? '保存中...' : isEdit ? '更新する' : '作成する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

