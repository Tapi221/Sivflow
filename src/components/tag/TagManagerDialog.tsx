import React, { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag as TagIcon, Check, Trash2, Pencil, GitMerge } from 'lucide-react';
import { useTags, DEFAULT_COLORS } from '@/hooks/useTags';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  subject: '教科',
  exam: '試験',
  difficulty: '難易度',
  type: '種別',
};

export default function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const { tags: allTags, updateTagColor, deleteTag, getTagUsageCount, renameTag, mergeTags } = useTags();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>('');
  const [pendingUsageCount, setPendingUsageCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);

  // rename state
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState('');
  const [mergeError, setMergeError] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);

  // merge state
  const [mergingFromId, setMergingFromId] = useState<string | null>(null);
  const [mergeIntoId, setMergeIntoId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // カテゴリ別グループ
  const grouped = useMemo(() => {
    const sorted = [...allTags].sort((a, b) => a.name.localeCompare(b.name));
    const map = new Map<string, typeof allTags>([
      ['', []],
      ['subject', []],
      ['exam', []],
      ['difficulty', []],
      ['type', []],
    ]);
    for (const t of sorted) {
      const key = t.categoryId ?? '';
      const bucket = map.get(key) ?? map.get('');
      if (bucket) bucket.push(t);
    }
    return map;
  }, [allTags]);

  const handleColorChange = async (tagId: string, newColor: string) => {
    await updateTagColor(tagId, newColor);
  };

  const openDeleteDialog = async (tagId: string, tagName: string) => {
    const usageCount = await getTagUsageCount(tagId);
    setPendingUsageCount(usageCount);
    setPendingDeleteId(tagId);
    setPendingDeleteName(tagName);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteId) return;
    try {
      setIsDeleting(true);
      await deleteTag(pendingDeleteId);
    } finally {
      setIsDeleting(false);
      setPendingDeleteId(null);
      setPendingDeleteName('');
      setPendingUsageCount(0);
    }
  };

  const handleRenameStart = (tagId: string, currentName: string) => {
    setMergingFromId(null);
    setMergeError('');
    setRenamingTagId(tagId);
    setRenameInput(currentName);
    setRenameError('');
    setTimeout(() => renameInputRef.current?.focus(), 0);
  };

  const handleRenameConfirm = async (tagId: string) => {
    const trimmed = renameInput.trim();
    if (!trimmed) { setRenamingTagId(null); return; }
    const result = await renameTag(tagId, trimmed);
    if (result?.error) {
      setRenameError(result.error);
      return;
    }
    setRenamingTagId(null);
    setRenameError('');
  };

  const handleMergeStart = (tagId: string) => {
    setRenamingTagId(null);
    setRenameError('');
    setMergingFromId(tagId);
    setMergeIntoId('');
    setMergeError('');
  };

  const handleMergeConfirm = async () => {
    if (!mergingFromId || !mergeIntoId) return;
    let shouldClose = false;
    try {
      setIsMerging(true);
      const result = await mergeTags(mergingFromId, mergeIntoId);
      if ('error' in result) {
        setMergeError(result.error);
        return;
      }
      setMergeError('');
      shouldClose = true;
    } finally {
      setIsMerging(false);
      if (shouldClose) {
        setMergingFromId(null);
        setMergeIntoId('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[70vh] flex flex-col p-0 overflow-hidden bg-[#F8FAFB] border-none rounded-[32px] shadow-2xl">
         <DialogTitle className="sr-only">Tag Management</DialogTitle>
         
         {/* Header */}
         <div className="p-8 pb-4 bg-white border-b border-slate-50 flex items-center justify-between shrink-0">
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                 <TagIcon className="w-6 h-6 text-primary-500" />
                 タグ管理（共通）
             </h2>
         </div>
         
         {/* Content */}
         <div className="flex-1 overflow-y-auto p-8 space-y-6">
             {allTags.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                     <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p>登録されているタグはありません</p>
                 </div>
             ) : (
                <div className="space-y-6">
                  {Array.from(grouped.entries()).map(([categoryKey, tagList]) => {
                    if (tagList.length === 0) return null;
                    return (
                      <div key={categoryKey}>
                        {categoryKey && (
                          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                            {CATEGORY_LABELS[categoryKey] ?? categoryKey}
                          </h3>
                        )}
                        <div className="grid grid-cols-1 gap-2">
                          {tagList.map(tag => (
                            <div key={tag.id} className="bg-white rounded-2xl border border-slate-50 shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center justify-between p-4 group">
                                {/* Tag name / rename input */}
                                {renamingTagId === tag.id ? (
                                  <div className="flex flex-col gap-1 flex-1 mr-2">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        ref={renameInputRef}
                                        value={renameInput}
                                        onChange={e => { setRenameInput(e.target.value); setRenameError(''); }}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') void handleRenameConfirm(tag.id);
                                          if (e.key === 'Escape') setRenamingTagId(null);
                                        }}
                                        className="h-8 text-sm"
                                      />
                                      <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void handleRenameConfirm(tag.id)}>保存</Button>
                                      <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setRenamingTagId(null)}>×</Button>
                                    </div>
                                    {renameError && <p className="text-xs text-red-500 px-1">{renameError}</p>}
                                  </div>
                                ) : (
                                  <div className={cn(
                                    "px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1.5 ml-2 transition-all",
                                    tag.color
                                  )}>
                                    <TagIcon className="w-3.5 h-3.5 opacity-70" />
                                    {tag.name}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                  {DEFAULT_COLORS.map(color => (
                                    <button
                                      key={color}
                                      onClick={() => void handleColorChange(tag.id, color)}
                                      className={cn(
                                        "w-7 h-7 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all hover:scale-105",
                                        color.split(' ')[0],
                                        color.split(' ')[2],
                                        tag.color === color
                                          ? "ring-2 ring-offset-2 ring-primary-600 scale-110 opacity-100 shadow-md"
                                          : "opacity-80 hover:opacity-100"
                                      )}
                                    >
                                      {tag.color === color && <Check className="w-3 h-3 mx-auto text-slate-700/70" />}
                                    </button>
                                  ))}
                                  <button
                                    type="button"
                                    onClick={() => handleRenameStart(tag.id, tag.name)}
                                    className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-500"
                                    aria-label={`${tag.name} をリネーム`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMergeStart(tag.id)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-purple-200 hover:bg-purple-50 hover:text-purple-500"
                                    aria-label={`${tag.name} をマージ`}
                                  >
                                    <GitMerge className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void openDeleteDialog(tag.id, tag.name)}
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                    aria-label={`${tag.name} を削除`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Merge panel */}
                              {mergingFromId === tag.id && (
                                <div className="px-4 pb-4 flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 shrink-0">マージ先:</span>
                                    <select
                                      value={mergeIntoId}
                                      onChange={e => { setMergeIntoId(e.target.value); setMergeError(''); }}
                                      className="flex-1 h-8 rounded-md border border-slate-300 text-sm px-2 bg-white"
                                    >
                                      <option value="">-- 選択 --</option>
                                      {allTags.filter(t => t.id !== tag.id).map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                      ))}
                                    </select>
                                    <Button
                                      size="sm"
                                      className="h-8 px-3 text-xs"
                                      disabled={!mergeIntoId || isMerging}
                                      onClick={() => void handleMergeConfirm()}
                                    >
                                      {isMerging ? '実行中...' : 'マージ'}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={() => { setMergingFromId(null); setMergeIntoId(''); setMergeError(''); }}>×</Button>
                                  </div>
                                  {mergeError && <p className="text-xs text-red-500 px-1">{mergeError}</p>}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
             )}
         </div>
         
         <div className="p-6 bg-white border-t border-slate-50 flex justify-end shrink-0">
             <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl px-6">
                 閉じる
             </Button>
         </div>

         <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => {
           if (!open) {
             setPendingDeleteId(null);
             setPendingDeleteName('');
             setPendingUsageCount(0);
           }
         }}>
           <AlertDialogContent className="max-w-md">
             <AlertDialogHeader>
               <AlertDialogTitle className="text-red-600">タグを削除しますか？</AlertDialogTitle>
               <AlertDialogDescription>
                 「{pendingDeleteName}」を削除すると、
                 {pendingUsageCount} 件のカードからこのタグが削除されます。
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel disabled={isDeleting}>キャンセル</AlertDialogCancel>
               <AlertDialogAction
                 onClick={(e) => {
                   e.preventDefault();
                   void handleDeleteConfirmed();
                 }}
                 disabled={isDeleting}
                 className="bg-red-600 hover:bg-red-500"
               >
                 {isDeleting ? '削除中...' : '削除する'}
               </AlertDialogAction>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
         
      </DialogContent>
    </Dialog>
  );
}
