import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { StickyNote, Image as ImageIcon, X, Upload, Loader2, RotateCcw } from 'lucide-react';
import { storage } from '@/services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import AutoResizeTextarea from '@/Components/ui/AutoResizeTextarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { UploadedImage } from '@/types';
import { createUploadedImage, createFailedUploadedImage, normalizeUploadedImages, isHeicFile, convertHeicToJpeg } from '@/utils/imageUtils';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';

export default function FolderMemo({ folder, onUpdate }: any) {
  const { currentUser } = useAuth();
  const initialMemoText = folder?.memoText ?? folder?.memo_text ?? '';
  const initialMemoImages = normalizeUploadedImages(folder?.memoImages ?? folder?.memo_images ?? []);
  const [memoText, setMemoText] = useState(initialMemoText);
  const [memoImages, setMemoImages] = useState<UploadedImage[]>(initialMemoImages);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const latestImagesRef = useRef(memoImages);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  useEffect(() => {
    setMemoText(folder?.memoText ?? folder?.memo_text ?? '');
    setMemoImages(normalizeUploadedImages(folder?.memoImages ?? folder?.memo_images ?? []));
  }, [folder]);

  useEffect(() => {
    latestImagesRef.current = memoImages;
  }, [memoImages]);
  
  // Debounced save
  // TODO: isSilentフォルダの通知/可視化要件が固まり次第、保存挙動や表示の扱いを拡張する
  useEffect(() => {
    if (!folder) return;
    
    const timeoutId = setTimeout(async () => {
      const currentText = folder.memoText ?? folder.memo_text ?? '';
      const currentImages = folder.memoImages ?? folder.memo_images ?? [];
      if (memoText !== currentText || 
          JSON.stringify(memoImages) !== JSON.stringify(currentImages)) {
        setIsSaving(true);
        await onUpdate({ 
          memoText: memoText,
          memoImages: memoImages,
        });
        setIsSaving(false);
      }
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [memoText, memoImages, folder, onUpdate]);
  
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
      const available = Math.max(0, 10 - current.length);
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

      setMemoImages([...current, ...prepared.map(item => item.image)]);

      await Promise.all(
        prepared.map(async (preparedItem) => {
          if (!preparedItem.file) return;
          const image = preparedItem.image;
          try {
            const result = await uploadFile(
                preparedItem.file, 
                getStoragePath(currentUser.uid), 
                { type: 'memo', folderId: folder?.id },
                (progress) => {
                   setMemoImages(prev => prev.map(item => 
                     item.id === image.id ? { ...item, progress } : item
                   ));
                }
            );
            
            // Ensure visual stability
            setMemoImages(prev => prev.map(item => 
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
                remoteUrl: result.url,
                storagePath: result.storagePath,
                status: 'ready' as const,
                progress: 100
              };
            });
            setMemoImages(updated);
          } catch (error) {
            const after = latestImagesRef.current;
            const updated = after.map(item =>
              item.id === image.id ? { ...item, status: 'failed' } : item
            );
            setMemoImages(updated);
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
    if (!currentUser) {
      alert('画像をアップロードするにはログインが必要です。');
      return;
    }

    const current = latestImagesRef.current;
    const previous = current[index];
    if (previous?.localUrl) {
      URL.revokeObjectURL(previous.localUrl);
    }

    const newImage = createUploadedImage(file);
    const replaced = current.map((item, i) => (i === index ? newImage : item));
    setMemoImages(replaced);

    try {
      const targetFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      const newImage = createUploadedImage(targetFile);
      const replaced = current.map((item, i) => (i === index ? newImage : item));
      setMemoImages(replaced);

      const result = await uploadFile(
          targetFile, 
          getStoragePath(currentUser.uid), 
          { type: 'memo', folderId: folder?.id }
      );

      const after = latestImagesRef.current;
      const updated = after.map(item => {
        if (item.id !== newImage.id) return item;
        if (item.localUrl) URL.revokeObjectURL(item.localUrl);
        return {
          ...item,
          localUrl: null,
          remoteUrl: result.url,
          storagePath: result.storagePath,
          status: 'ready' as const,
        };
      });
      setMemoImages(updated);
    } catch (error) {
      console.warn('Retry failed', error);
      const failedImage = createFailedUploadedImage(file);
      const replaced = current.map((item, i) => (i === index ? failedImage : item));
      setMemoImages(replaced);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (retryIndex !== null) {
      handleRetryUpload(files[0], retryIndex);
      setRetryIndex(null);
      e.target.value = '';
      return;
    }

    handleUpload(files);
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
  }, [memoImages]);
  
  const handleRemoveImage = (index: number) => {
    setMemoImages(prev => {
      const removed = prev[index];
      if (removed?.localUrl) {
        URL.revokeObjectURL(removed.localUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };
  
  if (!folder) return null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <StickyNote className="w-5 h-5" />
          メモ
          {isSaving && <span className="text-xs text-gray-400 font-normal">保存中...</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">メモ本文</label>
          <AutoResizeTextarea
            value={memoText}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMemoText(e.target.value)}
            placeholder="フォルダのメモを入力..."
            minRows={3}
            maxHeight={300}
            onPaste={handlePaste}
          />
        </div>
        
        {/* Images */}
        {memoImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {memoImages.map((image, index) => (
              <div key={index} className="relative group aspect-square">
                <img
                  src={image.remoteUrl ?? image.localUrl ?? ''}
                  alt={`Memo image ${index + 1}`}
                  className="w-full h-full object-contain rounded-lg border bg-white"
                />
                
                {/* Progress Overlay */}
                {image.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center rounded-lg">
                        <div className="w-3/4 bg-white/50 rounded-full h-1.5 overflow-hidden">
                             <div 
                                className="h-full bg-primary-600 transition-all duration-300"
                                style={{ width: `${image.progress ?? 0}%` }}
                             />
                        </div>
                    </div>
                )}

                {image.status === 'failed' && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute bottom-1 right-1 h-6 w-6 bg-white/80"
                    onClick={() => handleRetry(index)}
                  >
                    <RotateCcw className="w-3 h-3 text-red-500" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {/* Upload button */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setRetryIndex(null);
              fileInputRef.current?.click();
            }}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4 mr-1" />
            )}
            画像追加
          </Button>
          <input
            id="memo-image-upload"
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/heic,image/heif"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInputChange}
          />
          <span className="text-xs text-gray-400">
            Ctrl+Vで画像ペースト可能
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
