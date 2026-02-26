import React from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import { ArrowRight, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import Pin from 'lucide-react/dist/esm/icons/pin';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getLocalDb } from '@/services/localDB';
import type { Card, DocumentItem } from '@/types';

interface DocumentRowMenuProps {
  doc: DocumentItem;
  folders: any[];
  cards: Card[];
  documents: DocumentItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdateFolder?: (folderId: string, data: any) => Promise<void>;
  isPinned?: boolean;
  onTogglePin?: () => void;
  children: React.ReactNode;
}

const getFolderId = (f: any) => f?.id ?? f?.folderId ?? null;
const getFolderName = (f: any) => f?.folderName ?? f?.folder_name ?? '';
const isSoftDeleted = (item?: { isDeleted?: boolean; is_deleted?: boolean } | null) =>
  Boolean(item?.isDeleted ?? item?.is_deleted);

export function DocumentRowMenu({
  doc,
  folders,
  cards,
  documents,
  open,
  onOpenChange,
  onUpdateFolder,
  isPinned,
  onTogglePin,
  children,
}: DocumentRowMenuProps) {
  const { currentUser } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();

  const getNextOrderIndex = (folderId: string) => {
    let maxOrder = -1;
    for (const card of cards) {
      if (card.folderId !== folderId || isSoftDeleted(card as any)) continue;
      const order = card.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }
    for (const d of documents) {
      if (d.folderId !== folderId || isSoftDeleted(d as any) || d.id === doc.id) continue;
      const order = d.orderIndex ?? -1;
      if (order > maxOrder) maxOrder = order;
    }
    return maxOrder + 1;
  };

  const getDocDisplayName = () => {
    const legacyName = (doc as any)?.name as string | undefined;
    return doc.title || doc.fileName || legacyName || '無題のドキュメント';
  };

  const buildNotePdfMeta = (name: string) => ({
    id: doc.id,
    name,
    remoteUrl: doc.remoteUrl ?? doc.localUrl ?? doc.downloadUrl ?? null,
    storagePath: doc.storagePath ?? null,
    contentType: doc.mimeType ?? 'application/pdf',
    size: doc.sizeBytes ?? 0,
  });

  const updateNotePdfName = async (folderId: string, name: string) => {
    if (!onUpdateFolder) return;
    const folder = folders.find(f => getFolderId(f) === folderId);
    if (!folder) return;
    const existing = folder?.notePdfs ?? folder?.note_pdfs ?? [];
    const next = existing.map((p: any) => (p.id === doc.id ? { ...p, name } : p));
    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const removeNotePdfFromFolder = async (folderId: string) => {
    if (!onUpdateFolder) return;
    const folder = folders.find(f => getFolderId(f) === folderId);
    if (!folder) return;
    const existing = folder?.notePdfs ?? folder?.note_pdfs ?? [];
    const next = existing.filter((p: any) => p.id !== doc.id);
    if (next.length === existing.length) return;
    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const addNotePdfToFolder = async (folderId: string, name: string) => {
    if (!onUpdateFolder) return;
    const folder = folders.find(f => getFolderId(f) === folderId);
    if (!folder) return;
    const existing = folder?.notePdfs ?? folder?.note_pdfs ?? [];
    const next = [...existing, buildNotePdfMeta(name)];
    await onUpdateFolder(folderId, { notePdfs: next, note_pdfs: next });
  };

  const handleRename = async () => {
    const currentName = getDocDisplayName();
    const nextName = prompt('新しいドキュメント名を入力してください', currentName);
    if (!nextName || !nextName.trim() || nextName.trim() === currentName) return;

    if (!currentUser) {
      toastError('認証が必要です');
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.updateItem('documents', doc.id, { title: nextName.trim(), updatedAt: new Date() });
      await updateNotePdfName(doc.folderId, nextName.trim());
      toastSuccess?.('ドキュメント名を更新しました');
    } catch (err: any) {
      console.error('[DocumentRowMenu] rename failed', err);
      toastError(err?.message || 'ドキュメント名の変更に失敗しました');
    }
  };

  const handleMove = async () => {
    const targetFolderName = prompt('移動先のフォルダ名を入力してください(完全一致)');
    if (!targetFolderName) return;

    const targetFolder = folders.find(f => getFolderName(f) === targetFolderName);
    if (!targetFolder) {
      alert('フォルダが見つかりませんでした。');
      return;
    }

    const targetFolderId = getFolderId(targetFolder);
    if (!targetFolderId || targetFolderId === doc.folderId) return;

    if (!currentUser) {
      toastError('認証が必要です');
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      const nextOrderIndex = getNextOrderIndex(targetFolderId);
      await db.updateItem('documents', doc.id, {
        folderId: targetFolderId,
        orderIndex: nextOrderIndex,
        updatedAt: new Date(),
      });

      const name = getDocDisplayName();
      await removeNotePdfFromFolder(doc.folderId);
      await addNotePdfToFolder(targetFolderId, name);
      toastSuccess?.('ドキュメントを移動しました');
    } catch (err: any) {
      console.error('[DocumentRowMenu] move failed', err);
      toastError(err?.message || 'ドキュメントの移動に失敗しました');
    }
  };

  const handleDelete = async () => {
    if (!confirm('このドキュメントを削除しますか?')) return;
    if (!currentUser) {
      toastError('認証が必要です');
      return;
    }

    try {
      const db = await getLocalDb(currentUser.uid);
      await db.softDelete('documents', doc.id);
      await removeNotePdfFromFolder(doc.folderId);
    } catch (err: any) {
      console.error('[DocumentRowMenu] delete failed', err);
      toastError(err?.message || 'ドキュメントの削除に失敗しました');
    }
  };

  const handleOpenNewTab = () => {
    const url = doc.remoteUrl ?? doc.localUrl ?? doc.downloadUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      toastError('PDFのURLが見つかりません');
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {onTogglePin && (
          <DropdownMenuItem onClick={onTogglePin} className="gap-2">
            <Pin className={`w-4 h-4 ${isPinned ? 'text-amber-500' : ''}`} />
            {isPinned ? 'ピン留めを外す' : 'ピン留めに追加'}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleRename} className="gap-2">
          <Pencil className="w-4 h-4" /> 名前を変更
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleMove} className="gap-2">
          <ArrowRight className="w-4 h-4" /> 移動
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleOpenNewTab} className="gap-2">
          <ExternalLink className="w-4 h-4" /> 新しいタブで開く
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50"
        >
          <Trash2 className="w-4 h-4" /> 削除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
