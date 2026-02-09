import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/Components/ui/button';
import { StickyNote, Image as ImageIcon, X, Upload, Loader2, RotateCcw, Plus, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { UploadedImage, FolderMemoItem } from '@/types';
import type { StorageUrl, BlobUrl } from '@/types/branded';
import { createUploadedImage, createFailedUploadedImage, normalizeUploadedImages, isHeicFile, convertHeicToJpeg } from '@/utils/imageUtils';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface MemoItemProps {
  item: FolderMemoItem;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onSave: (content: string, images: UploadedImage[]) => Promise<void>;
  settings: any;
  currentUser: any;
  folderId: string;
}

const MemoItemEditor = ({ 
  item, 
  onSave, 
  onCancel, 
  settings, 
  currentUser, 
  folderId 
}: { 
  item: Partial<FolderMemoItem>, 
  onSave: (content: string, images: UploadedImage[]) => Promise<void>, 
  onCancel: () => void,
  settings: any,
  currentUser: any,
  folderId: string
}) => {
  const [content, setContent] = useState(item.content || '');
  const [images, setImages] = useState<UploadedImage[]>(item.images || []);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const latestImagesRef = useRef(images);

  useEffect(() => {
    latestImagesRef.current = images;
  }, [images]);

  const { uploadFile } = useReliableFileUpload();
  const getStoragePath = (uid: string) => (fileName: string) => `users/${uid}/uploads/${fileName}`;

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!currentUser) {
      alert('画像をアップロードするにはログインが必要です。');
      return;
    }
    
    setIsUploading(true);
    try {
      const current = latestImagesRef.current;
      const available = Math.max(0, 15 - current.length);
      const filesArray = Array.from(files).slice(0, available);

      const prepared = await Promise.all(
        filesArray.map(async (file) => {
          if (isHeicFile(file)) {
            try {
              const converted = await convertHeicToJpeg(file);
              return { file: converted, image: createUploadedImage(converted) };
            } catch (error) {
              console.warn('HEIC conversion failed', error);
              return { file: null, image: createFailedUploadedImage(file) };
            }
          }
          return { file, image: createUploadedImage(file) };
        })
      );

      setImages([...current, ...prepared.map(item => item.image as UploadedImage)]);

      await Promise.all(
        prepared.map(async (preparedItem) => {
          if (!preparedItem.file) return;
          const image = preparedItem.image;
          try {
            const result = await uploadFile(
                preparedItem.file, 
                getStoragePath(currentUser.uid), 
                { type: 'memo', folderId: folderId },
                (progress) => {
                   setImages(prev => prev.map(item => 
                     item.id === image.id ? { ...item, progress } : item
                   ));
                }
            );
            
            setImages(prev => prev.map(item => 
                 item.id === image.id ? { ...item, progress: 100 } : item
            ));
            await new Promise(resolve => setTimeout(resolve, 800));

            const after = latestImagesRef.current;
            const updated = after.map(item => {
              if (item.id !== image.id) return item;
              if (item.localUrl) URL.revokeObjectURL(item.localUrl);
              return {
                ...item,
                localUrl: null,
                remoteUrl: result.url as StorageUrl,
                storagePath: result.storagePath,
                status: 'ready' as const,
                progress: 100
              };
            });
            setImages(updated);
          } catch (error) {
            const after = latestImagesRef.current;
            const updated = after.map(item =>
              item.id === image.id ? { ...item, status: 'failed' as const } : item
            );
            setImages(updated);
          }
        })
      );
    } catch (error) {
      console.error('アップロードエラー:', error);
    }
    setIsUploading(false);
  };

  const handleRetry = (index: number) => {
    setRetryIndex(index);
    fileInputRef.current?.click();
  };

const handleRetryUpload = async (file: File, index: number) => {
    if (!currentUser) return;

    const current = latestImagesRef.current;
    const previous = current[index];
    if (previous?.localUrl) URL.revokeObjectURL(previous.localUrl);

    const newImage = createUploadedImage(file) as UploadedImage;
    const replaced = current.map((item, i) => (i === index ? newImage : item));
    setImages(replaced);

    try {
      const targetFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      const newImageWithFile = createUploadedImage(targetFile) as UploadedImage;
      const replacedWithNew = current.map((item, i) => (i === index ? newImageWithFile : item));
      setImages(replacedWithNew);

      const result = await uploadFile(
          targetFile, 
          getStoragePath(currentUser.uid), 
          { type: 'memo', folderId: folderId }
      );

      const after = latestImagesRef.current;
      const updated = after.map(item => {
        if (item.id !== newImageWithFile.id) return item;
        if (item.localUrl) URL.revokeObjectURL(item.localUrl);
        return {
          ...item,
          localUrl: null,
          remoteUrl: result.url as StorageUrl,
          storagePath: result.storagePath,
          status: 'ready' as const,
        };
      });
      setImages(updated);
    } catch (error) {
      const failedImage = createFailedUploadedImage(file);
      const replacedFailed = current.map((item, i) => (i === index ? failedImage : item));
      setImages(replacedFailed);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (retryIndex !== null) {
      handleRetryUpload(files[0], retryIndex);
      setRetryIndex(null);
    } else {
      handleUpload(files);
    }
    e.target.value = '';
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = (e as any).clipboardData?.items;
    if (!items) return;
    
    const imageFiles: File[] = [];
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleUpload(imageFiles as unknown as FileList);
    }
  }, [images]);

  const handleRemoveImage = (index: number) => {
    setImages(prev => {
      const removed = prev[index];
      if (removed?.localUrl) URL.revokeObjectURL(removed.localUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSaveClick = async () => {
    if (!content.trim() && images.length === 0) return;
    setIsSaving(true);
    await onSave(content, images);
    setIsSaving(false);
  };

  return (
    <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="space-y-3">
            <AutoResizeTextarea
              value={content}
              autoFocus
              onChange={(e) => setContent(e.target.value)}
              placeholder="メモを入力..."
              minRows={4}
              maxHeight={400}
              onPaste={handlePaste}
              className="bg-slate-50 border-none rounded-xl p-4 text-slate-700 text-sm focus-visible:ring-primary-600/10 resize-none w-full"
            />
        </div>

        {images.length > 0 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
             {images.map((image, index) => (
                 <div key={image.id || index} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                    <img
                      src={image.remoteUrl ?? image.localUrl ?? ''}
                      alt={`Memo image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {image.status === 'uploading' && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                        </div>
                    )}
                    <button
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/40 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                      onClick={() => handleRemoveImage(index)}
                      title="画像を削除"
                      aria-label="画像を削除"
                    >
                      <X className="w-3 h-3" />
                    </button>
                 </div>
             ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
           <div className="flex items-center gap-2">
               <Button
                 variant="ghost"
                 size="sm"
                 className="text-slate-400 hover:text-primary-600 h-9 px-3 gap-2 rounded-full"
                 onClick={() => fileInputRef.current?.click()}
                 disabled={isUploading}
               >
                 {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                 <span className="text-xs">画像</span>
               </Button>
                <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/heic,image/heif"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    title="画像をアップロード"
                    aria-label="画像をアップロード"
                />
           </div>
           
           <div className="flex items-center gap-2">
               <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-full text-slate-400 hover:text-slate-600">キャンセル</Button>
               <Button 
                onClick={handleSaveClick} 
                disabled={isSaving || (!content.trim() && images.length === 0)}
                className="rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-sm px-6"
               >
                 {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                 保存
               </Button>
           </div>
        </div>
    </div>
  );
};

export default function FolderMemo({ folder, onUpdate }: any) {
  const { currentUser } = useAuth();
  const { settings } = useUserSettings();
  
  // Memos state
  const [memos, setMemos] = useState<FolderMemoItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Initial Data Sync & Migration
  useEffect(() => {
    if (!folder) return;
    
    if (folder.memos && Array.isArray(folder.memos)) {
      setMemos(folder.memos);
    } else {
      // Migration: Convert legacy single memo to array
      const legacyText = folder.memoText ?? folder.memo_text;
      const legacyImages = folder.memoImages ?? folder.memo_images;
      
      if (legacyText || (legacyImages && legacyImages.length > 0)) {
        const migratedMemo: FolderMemoItem = {
           id: 'legacy-memo',
           content: legacyText || '',
           images: normalizeUploadedImages(legacyImages || []) as UploadedImage[],
           createdAt: Date.now(),
           updatedAt: Date.now()
        };
        setMemos([migratedMemo]);
      } else {
        setMemos([]);
      }
    }
  }, [folder]);

  const handleAddMemo = async (content: string, images: UploadedImage[]) => {
      const newMemo: FolderMemoItem = {
          id: crypto.randomUUID(),
          content,
          images,
          createdAt: Date.now(),
          updatedAt: Date.now()
      };
      
      const newMemos = [newMemo, ...memos];
      setMemos(newMemos);
      await onUpdate({ memos: newMemos });
      setIsAdding(false);
  };

  const handleUpdateMemo = async (id: string, content: string, images: UploadedImage[]) => {
      const newMemos = memos.map(m => m.id === id ? { ...m, content, images, updatedAt: Date.now() } : m);
      setMemos(newMemos);
      await onUpdate({ memos: newMemos });
      setEditingId(null);
  };

  const handleDeleteMemo = async (id: string) => {
      if (!confirm('このメモを削除しますか？')) return;
      const newMemos = memos.filter(m => m.id !== id);
      setMemos(newMemos);
      await onUpdate({ memos: newMemos });
  };
  
  if (!folder) return null;
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-4xl mx-auto">
      {/* ヘッダーセクション */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-4">
          <div 
            className="p-2.5 rounded-2xl shadow-sm border border-white/50 backdrop-blur-sm transition-transform hover:scale-105 memo-header-icon"
            style={{ 
              '--memo-accent-bg': settings?.accentColor ? `${settings?.accentColor}15` : 'transparent',
              '--memo-accent-color': settings?.accentColor || 'var(--primary-color)',
            } as React.CSSProperties}
          >
            <StickyNote className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] leading-none mb-1.5">Memos</span>
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-extrabold text-slate-700 tracking-tight">フォルダメモ</h2>
              <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full">{memos.length}</span>
            </div>
          </div>
        </div>
        
        {!isAdding && (
             <Button 
                onClick={() => setIsAdding(true)} 
                variant="outline"
                className="rounded-full border-slate-200 text-slate-600 hover:text-primary-600 hover:border-primary-600/30 font-bold gap-2 pl-3 pr-4 shadow-sm bg-white"
             >
                 <Plus className="w-4 h-4" />
                 <span>メモを追加</span>
             </Button>
        )}
      </div>

      <div className="space-y-6">
        {/* 新規作成エディタ */}
        {isAdding && (
            <div className="relative">
                <div className="absolute -left-4 top-4 w-1 h-full bg-slate-100 rounded-full hidden md:block" />
                <MemoItemEditor
                    item={{}}
                    onSave={handleAddMemo}
                    onCancel={() => setIsAdding(false)}
                    settings={settings}
                    currentUser={currentUser}
                    folderId={folder.id}
                />
            </div>
        )}

        {/* メモリスト */}
        {memos.length === 0 && !isAdding && (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                <StickyNote className="w-8 h-8 opacity-20 mb-3" />
                <p className="text-sm font-bold opacity-60">まだメモがありません</p>
                <Button variant="link" onClick={() => setIsAdding(true)} className="text-primary-600 font-bold">最初のメモを作成</Button>
            </div>
        )}

        {memos.map((memo) => (
            <div key={memo.id} className="group relative">
                {editingId === memo.id ? (
                    <MemoItemEditor
                        item={memo}
                        onSave={(content, images) => handleUpdateMemo(memo.id, content, images)}
                        onCancel={() => setEditingId(null)}
                        settings={settings}
                        currentUser={currentUser}
                        folderId={folder.id}
                    />
                ) : (
                    <div className="bg-white rounded-[24px] border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all group-hover:border-slate-200">
                        {/* メモヘッダー（日付・操作） */}
                        <div className="flex items-center justify-between mb-3 select-none">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                {format(memo.updatedAt || memo.createdAt || Date.now(), 'yyyy.MM.dd HH:mm', { locale: ja })}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => setEditingId(memo.id)} className="h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50">
                                    <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteMemo(memo.id)} className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50">
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </div>

                        {/* 本文 */}
                        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {memo.content}
                        </div>

                        {/* 画像 */}
                        {memo.images && memo.images.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-50 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                                {memo.images.map((img, i) => (
                                    <div key={i} className="aspect-square rounded-lg bg-slate-50 border border-slate-100 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(img.remoteUrl || img.localUrl || '', '_blank')}>
                                        <img src={img.remoteUrl || img.localUrl || ''} className="w-full h-full object-cover" loading="lazy" alt="メモ画像" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        ))}
      </div>
    </div>
  );
}
