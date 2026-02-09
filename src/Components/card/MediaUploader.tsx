import React, { useCallback, useState, useEffect, useRef, useId } from 'react';
import { Button } from '@/Components/ui/button';
import { Upload, X, Menu, ChevronDown, Play, Pause, Loader2, RotateCcw, Cloud, Check } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { storage } from '@/services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import type { UploadedImage } from '@/types';
import { createUploadedImage, createFailedUploadedImage, isHeicFile, convertHeicToJpeg, compressAndConvertToBase64 } from '@/utils/imageUtils';
import type { UploadedImageStatus } from '@/types';
import type { BlobUrl, StorageUrl } from '@/types/branded';
import { useReliableFileUpload } from '@/hooks/useReliableFileUpload';

function ImageItem({ item, index, onRemove, onDownload, onRetry }) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const displayUrl = item.remoteUrl ?? item.localUrl ?? '';
  const isFailed = item.status === 'failed';
  // Use optimistic UI: "uploading" is now a background state, not a blocking one.
  // We show a small badge instead of blocking the image.
  
  return (
    <>
      <Draggable draggableId={`draggable-img-${item.id || index}-${index}`} index={index}>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className="relative group border rounded-lg overflow-hidden bg-gray-50"
          >
            <div
              {...provided.dragHandleProps}
              className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded p-1"
            >
              <Menu className="w-4 h-4 text-gray-500" />
            </div>
            
            {displayUrl ? (
              <img
                src={displayUrl}
                alt={`Image ${index + 1}`}
                className="w-full h-24 object-contain cursor-pointer bg-white"
                onClick={() => setShowFullscreen(true)}
              />
            ) : (
              <div className="w-full h-24 bg-white" />
            )}

            {/* Optimistic Status Badges & Progress */}
            <div className="absolute inset-x-2 bottom-2 z-20">
                 {item.status === 'uploading' && item.progress !== undefined && item.progress < 100 && (
                     <div className="bg-white/90 rounded-full h-1 overflow-hidden shadow-sm">
                        <div 
                          className="h-full progress-bar-fill" 
                          style={{ '--progress': `${item.progress}%`, '--progress-color': 'var(--primary-color)' } as React.CSSProperties} 
                        />
                     </div>
                 )}
            </div>

            <div className="absolute bottom-1 right-1 flex gap-1 z-20">
                {item.source === 'cloud' && (
                    <div className="p-0.5 bg-green-500 rounded-full shadow-sm" title="Synced to cloud">
                        <Check className="w-3 h-3 text-white" />
                    </div>
                )}
                {item.source === 'local_fallback' && (
                    <div className="p-1.5 bg-amber-500 rounded-full shadow-sm" title={`Saved locally (${item.fallbackReason ?? 'offline'})`}>
                    </div>
                )}
            </div>
            
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/80"
                onClick={() => onDownload(displayUrl)}
                disabled={!displayUrl}
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
              {isFailed && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-white/80"
                  onClick={() => onRetry(index)}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="h-7 w-7 bg-white/80 hover:bg-red-100"
                onClick={() => onRemove(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}
      </Draggable>
      
      {showFullscreen && displayUrl && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullscreen(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setShowFullscreen(false)}
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={displayUrl}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
}

function AudioItem({ url, index, onRemove }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);
  
  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50">
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setIsPlaying(false)}
      />
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </Button>
      <span className="flex-1 text-sm text-gray-600 truncate">
        音声 {index + 1}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-red-500 hover:bg-red-50"
        onClick={() => onRemove(index)}
      >
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

interface MediaUploaderProps {
  type?: 'image' | 'audio';
  urls?: (string | UploadedImage)[];
  onChange: (urls: (string | UploadedImage)[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
}

export default function MediaUploader({ 
  type = 'image', 
  urls = [], 
  onChange,
  maxFiles = 10,
  initialFile,
  onConsumeInitialFile,
  onFilesExcess
}: MediaUploaderProps) {
  const { currentUser } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [retryIndex, setRetryIndex] = useState<number | null>(null);
  const latestItemsRef = useRef(urls);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const uniqueId = useId();
  const inputId = `file-${type}-${uniqueId}`;

  // Handle initialFile (pending upload from overflow)
  useEffect(() => {
    if (initialFile && onConsumeInitialFile) {
        // Automatically start uploading the file
        handleUpload([initialFile]);
        // Notify parent that the file has been consumed so it can be cleared from state
        onConsumeInitialFile();
    }
  }, [initialFile]);

  useEffect(() => {
    latestItemsRef.current = urls;
  }, [urls]);
  
  const accept = type === 'image'
    ? 'image/png,image/jpeg,image/jpg,image/heic,image/heif'
    : 'audio/*';

  const ariaLabel = type === 'image' ? '画像をアップロード' : '音声をアップロード';

  const { uploadFile } = useReliableFileUpload();

  // Helper to generate storage path
  const getStoragePath = (uid: string) => (fileName: string) => `users/${uid}/uploads/${fileName}`;
  
  const handleUpload = async (files: FileList | File[]) => {
    console.log('[MediaUploader] handleUpload called with', files);
    if (!files || files.length === 0) return;

    // 認証チェック
    if (!currentUser) {
      alert('画像をアップロードするにはログインが必要です。');
      return;
    }

    const isImage = type === 'image';
    const currentCount = urls.length;
    let limit = Math.max(0, maxFiles - currentCount);
    
    // Convert to array
    const allFiles = Array.from(files);
    
    // Split into current vs excess
    const filesToUpload = allFiles.slice(0, limit);
    const filesExcess = allFiles.slice(limit);
    
    // Notify parent about excess files
    if (filesExcess.length > 0 && onFilesExcess) {
        onFilesExcess(filesExcess);
    }
    
    // Even if limit is 0 (full), we might have just consumed the initialFile which calls this function.
    // However, if we are full and handleUpload is called, limit is 0.
    // BUT, initialFile logic calls handleUpload([file]). At that point, the block is likely empty (newly created).
    // So 'limit' should be correct (1-0=1).
    
    if (filesToUpload.length === 0) {
        return;
    }

    const filesArray = filesToUpload;

    console.log('[MediaUploader] Processing files:', filesArray.length, 'isImage:', isImage);

    if (!isImage) {
      setIsUploading(true);
      try {
        const uploadAudioWrapper = async (file: File) => {
            return await uploadFile(file, getStoragePath(currentUser.uid), { 
                type: 'card_audio' 
            });
        };

        // maxFiles=1 の場合は最初の1ファイルのみ処理
        const filesToUpload = maxFiles === 1 ? filesArray.slice(0, 1) : filesArray;
        const results = await Promise.allSettled(filesToUpload.map(uploadAudioWrapper));
        const uploadedUrls = results
          .filter(result => result.status === 'fulfilled')
          .map((result: any) => result.value.url);

        if (uploadedUrls.length > 0) {
          if (maxFiles === 1) {
            // 単一ファイル制限の場合は置き換え
            onChange([uploadedUrls[0]]);
          } else {
            onChange([...(urls as string[]), ...uploadedUrls]);
          }
        }

        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0) {
           console.error('Audio upload failures:', failures);
           alert(`${failures.length}件のファイルのアップロードに失敗しました。`);
        }
      } catch (error: any) {
        console.error('[MediaUploader] Audio upload error:', error);
        alert(`ファイルのアップロードに失敗しました: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Image Upload Logic using Hook
    try {
      console.log('[MediaUploader] Preparing images...');
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

      console.log('[MediaUploader] Images prepared:', prepared.length);
      const newImages = [...(urls as UploadedImage[]), ...prepared.map((item) => item.image)];
      latestItemsRef.current = newImages; // 最新の状態を保存
      onChange(newImages);

      // Process uploads
      console.log('[MediaUploader] Starting uploads...');
      await Promise.all(
        prepared.map(async (preparedItem) => {
          if (!preparedItem.file) return;
          const image = preparedItem.image;
          
          try {
            console.log('[MediaUploader] Uploading image:', image.id);
            const result = await uploadFile(
              preparedItem.file, 
              getStoragePath(currentUser.uid), 
              { type: 'card_image' },
              (progress) => {
               // Update progress state
               const current = latestItemsRef.current as UploadedImage[] || [];
               const updated = current.map(item => 
                 item.id === image.id ? { ...item, progress: progress } : item
               );
               onChange(updated);
            }
          );
          
          console.log('[MediaUploader] Upload complete for image:', image.id, result);
          
          // Ensure cloud sync icon is visible for at least 1 second and force 100%
          const currentMid = latestItemsRef.current as UploadedImage[] || [];
           const updatedMid = currentMid.map(item => 
             item.id === image.id ? { ...item, progress: 100 } : item
           );
           onChange(updatedMid);

          await new Promise(resolve => setTimeout(resolve, 800));
          
          const current = (latestItemsRef.current as UploadedImage[]) || [];
          const updated = current.map(item => {
            if (item.id !== image.id) return item;
            if (item.localUrl) URL.revokeObjectURL(item.localUrl);
            return {
              ...item,
              localUrl: null,
              remoteUrl: (result.url || null) as StorageUrl | null,
              storagePath: result.storagePath || null,
              status: 'ready' as UploadedImageStatus,
              source: result.source || null,
              fallbackReason: result.fallbackReason || null,
            progress: 100 // completed
            };
          });
          latestItemsRef.current = updated; // 最新の状態を保存
          onChange(updated);
          console.log('[MediaUploader] State updated after upload complete:', updated.length);
        } catch (error: any) {
          console.error('[MediaUploader] Image upload error for:', image.id, error);
          const current = (latestItemsRef.current as UploadedImage[]) || [];
          const updated = current.map(item =>
            item.id === image.id ? { ...item, status: 'failed' as UploadedImageStatus, error: error.message } : item
          );
          latestItemsRef.current = updated; // 最新の状態を保存
          onChange(updated);
        }
      })
    );
    } catch (error: any) {
      console.error('[MediaUploader] Image preparation/upload error:', error);
      alert(`画像のアップロードに失敗しました: ${error.message}`);
    }
  };

  const handleRetry = (index: number) => {
    if (type !== 'image') return;
    setRetryIndex(index);
    fileInputRef.current?.click();
  };

  const handleRetryUpload = async (file: File, index: number) => {
    if (!currentUser) {
      alert('画像をアップロードするにはログインが必要です。');
      return;
    }

    const current = (latestItemsRef.current as UploadedImage[]) || [];
    const previous = current[index];
    if (previous?.localUrl) {
      URL.revokeObjectURL(previous.localUrl);
    }

    try {
      const targetFile = isHeicFile(file) ? await convertHeicToJpeg(file) : file;
      const newImage = createUploadedImage(targetFile) as UploadedImage;
      const replaced = current.map((item, i) => (i === index ? newImage : item));
      onChange(replaced);

      const result = await uploadFile(
        targetFile, 
        getStoragePath(currentUser.uid),
        { type: 'card_image' }
      );
      
      const after = (latestItemsRef.current as UploadedImage[]) || [];
      const updated = after.map(item => {
        if (item.id !== newImage.id) return item;
        if (item.localUrl) URL.revokeObjectURL(item.localUrl);
        return {
          ...item,
          localUrl: null,
          remoteUrl: (result.url || null) as StorageUrl | null,
          storagePath: result.storagePath || null,
          status: 'ready' as UploadedImageStatus,
          source: result.source || null,
          fallbackReason: result.fallbackReason || null
        };
      });
      onChange(updated);
    } catch (error: any) {
      console.warn('Retry failed', error);
      // Fallback failed or hook threw
      const failedImage = createFailedUploadedImage(file) as UploadedImage;
      const replaced = current.map((item, i) => (i === index ? failedImage : item));
      onChange(replaced);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (retryIndex !== null && type === 'image') {
      const file = files[0];
      handleRetryUpload(file, retryIndex);
      setRetryIndex(null);
      event.target.value = '';
      return;
    }

    handleUpload(files);
    event.target.value = '';
  };
  
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  }, [urls]);
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  
  const handleDragLeave = () => {
    setDragOver(false);
  };
  
  // Handle paste for images and audio
  const handlePaste = useCallback(async (e) => {
    // Only handle paste if mouse is hovering over this uploader instance
    if (!containerRef.current?.matches(':hover')) return;
    
    const items = e.clipboardData?.items;
    if (!items) return;
    
    const files = [];
    for (const item of items) {
      if (type === 'image' && item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      } else if (type === 'audio' && item.type.startsWith('audio/')) {
        const file = item.getAsFile();
        if (file) files.push(file);
      }
    }
    
    // We pass ALL files to handleUpload, which now knows how to split them.
    if (files.length > 0) {
      e.preventDefault();
      await handleUpload(files);
    }
  }, [urls, type, maxFiles, onFilesExcess]);
  
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);
  
  const handleRemove = (index: number) => {
    if (type === 'image') {
      const items = urls as UploadedImage[];
      const removed = items[index];
      if (removed?.localUrl) {
        URL.revokeObjectURL(removed.localUrl);
      }
      const next = items.filter((_, i) => i !== index);
      onChange(next);
      return;
    }

    const newUrls = (urls as string[]).filter((_, i) => i !== index);
    onChange(newUrls);
  };
  
  const handleReorder = (result) => {
    if (!result.destination) return;

    const list = Array.from(urls as any[]);
    const [removed] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, removed);
    
    onChange(list);
  };
  
  const handleDownload = (url: string) => {
    window.open(url, '_blank');
  };
  
  return (
    <div className="space-y-3" ref={containerRef}>
      {/* 
          urls が空の場合のみ、大きなアップロードエリアを表示する。
          画像や音声が既に1つ以上ある場合は、この巨大なエリアは隠して
          コンテンツリストの末尾に小さな「追加」ボタンを表示する。
      */}
      {urls.length === 0 && (
        <div
          className={cn(
            "border-2 border-dashed rounded-[24px] p-5 text-center transition-all duration-300 cursor-pointer group/upload",
            dragOver ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => {
            setRetryIndex(null);
            fileInputRef.current?.click();
          }}
        >
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            aria-label={ariaLabel}
          />
          
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-indigo-600">
              <Upload className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
              <p className="text-sm">
                 アップロード中...
              </p>
            </div>
          ) : (
            <div className="text-slate-400 group-hover/upload:text-slate-500 transition-colors select-none">
              <Upload className="w-6 h-6 mx-auto mb-2 opacity-60" />
              <p className="text-[10px] font-bold tracking-widest uppercase">
                ドラッグ＆ドロップ、クリック、または Ctrl+V で
                {type === 'image' ? '画像を' : '音声を'}アップロード
              </p>
            </div>
          )}
        </div>
      )}

      {/* 
          隠し input 要素: 
          大きなエリアを隠しても、追加ボタンからクリックイベントを発火させるために必要。
      */}
      {urls.length > 0 && (
        <input
          id={`${inputId}-hidden`}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          aria-label={ariaLabel}
        />
      )}
      
      {urls.length > 0 && (
        <DragDropContext onDragEnd={handleReorder}>
          <Droppable droppableId={`media-${type}`} direction={type === 'image' ? 'horizontal' : 'vertical'}>
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  type === 'image' 
                    ? "grid grid-cols-2 sm:grid-cols-3 gap-2" 
                    : "space-y-2"
                )}
              >
                {urls.map((item, index) => (
                  type === 'image' ? (
                    <ImageItem
                      key={`img-${(item as UploadedImage).id ?? index}-${index}`}
                      item={item as UploadedImage}
                      index={index}
                      onRemove={handleRemove}
                      onDownload={handleDownload}
                      onRetry={handleRetry}
                    />
                  ) : (
                    <AudioItem
                      key={`audio-${index}`}
                      url={item as string}
                      index={index}
                      onRemove={handleRemove}
                    />
                  )
                ))}
                
                {/* 
                    追加ボタンを表示するタイル: 
                    画像リストまたは音声リストの末尾に配置される。
                */}
                {urls.length < maxFiles && (
                  type === 'image' ? (
                    <div
                      className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-all text-slate-400"
                      onClick={() => {
                        setRetryIndex(null);
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">追加</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-2 border-dashed text-slate-500 py-2.5 h-auto"
                      onClick={() => {
                        setRetryIndex(null);
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-xs uppercase font-bold">音声を追加</span>
                    </Button>
                  )
                )}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
