import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import { Tag as TagIcon, Check, Trash2 } from 'lucide-react';
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
} from '@/Components/ui/alert-dialog';

interface TagManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TagManagerDialog({ open, onOpenChange }: TagManagerDialogProps) {
  const { tags: allTags, updateTagColor, deleteTag, getTagUsageCount } = useTags();
  const [pendingDeleteTag, setPendingDeleteTag] = useState<string | null>(null);
  const [pendingUsageCount, setPendingUsageCount] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // 全タグをアルファベット順にソート
  const sortedTags = useMemo(() => {
      return [...allTags].sort((a, b) => a.name.localeCompare(b.name));
  }, [allTags]);

  const handleColorChange = async (tagName: string, newColor: string) => {
      await updateTagColor(tagName, newColor);
  };

  const openDeleteDialog = async (tagName: string) => {
    const usageCount = await getTagUsageCount(tagName);
    setPendingUsageCount(usageCount);
    setPendingDeleteTag(tagName);
  };

  const handleDeleteConfirmed = async () => {
    if (!pendingDeleteTag) return;
    try {
      setIsDeleting(true);
      await deleteTag(pendingDeleteTag);
    } finally {
      setIsDeleting(false);
      setPendingDeleteTag(null);
      setPendingUsageCount(0);
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
             {sortedTags.length === 0 ? (
                 <div className="text-center py-20 text-slate-400">
                     <TagIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                     <p>登録されているタグはありません</p>
                 </div>
             ) : (
                <div className="grid grid-cols-1 gap-2">
                    {sortedTags.map(tag => (
                        <div key={tag.name} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 rounded-2xl transition-all group border border-slate-50 shadow-sm hover:shadow-md">
                            {/* Tag Preview */}
                            <div className={cn(
                                "px-3 py-1.5 rounded-full text-sm font-bold border flex items-center gap-1.5 ml-2 transition-all", 
                                tag.color
                            )}>
                                <TagIcon className="w-3.5 h-3.5 opacity-70" />
                                {tag.name}
                            </div>
                            
                            {/* Color Palette */}
                            <div className="flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                                {DEFAULT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => handleColorChange(tag.name, color)}
                                        className={cn(
                                            "w-7 h-7 rounded-full border-2 ring-1 ring-slate-300/70 shadow-sm transition-all hover:scale-105",
                                            color.split(' ')[0], // bg class
                                            color.split(' ')[2], // border class
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
                                  onClick={() => void openDeleteDialog(tag.name)}
                                  className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                  aria-label={`${tag.name} を削除`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
             )}
         </div>
         
         <div className="p-6 bg-white border-t border-slate-50 flex justify-end shrink-0">
             <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl px-6">
                 閉じる
             </Button>
         </div>

         <AlertDialog open={Boolean(pendingDeleteTag)} onOpenChange={(open) => {
           if (!open) {
             setPendingDeleteTag(null);
             setPendingUsageCount(0);
           }
         }}>
           <AlertDialogContent className="max-w-md">
             <AlertDialogHeader>
               <AlertDialogTitle className="text-red-600">タグを削除しますか？</AlertDialogTitle>
               <AlertDialogDescription>
                 「{pendingDeleteTag ?? ''}」を削除すると、
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
