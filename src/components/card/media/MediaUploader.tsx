import { useCallback, useId, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Button } from "@/chip/ui/button/button";
import type { UploadedImage } from "@/types";
import { Upload, X } from "@/ui/icons";

type ImageMediaUploaderProps = {
  type?: "image";
  urls?: UploadedImage[];
  onChange: (urls: UploadedImage[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  autoOpenPicker?: boolean;
  displayMode?: "fixed" | "fluid";
  zoom?: number;
};
type AudioMediaUploaderProps = {
  type: "audio";
  urls?: string[];
  onChange: (urls: string[]) => void;
  maxFiles?: number;
  initialFile?: File;
  onConsumeInitialFile?: () => void;
  onFilesExcess?: (files: File[]) => void;
  autoOpenPicker?: boolean;
};
type MediaUploaderProps = ImageMediaUploaderProps | AudioMediaUploaderProps;

const EMPTY_IMAGE_URLS: UploadedImage[] = [];
const EMPTY_AUDIO_URLS: string[] = [];
const createLocalId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const createLocalImage = (file: File): UploadedImage => {
  const id = createLocalId();
  return {
    id,
    assetId: id,
    localUrl: URL.createObjectURL(file) as UploadedImage["localUrl"],
    remoteUrl: null,
    status: "ready",
    contentType: file.type || null,
    size: file.size,
    sizeBytes: file.size,
    source: "local_fallback",
    scale: 1,
    x: 0,
    layout: null,
    naturalW: null,
    naturalH: null,
  };
};
const getImageUrl = (image: UploadedImage): string => image.remoteUrl ?? image.localUrl ?? "";

const MediaUploader = (props: MediaUploaderProps) => {
  const {
    type = "image",
    urls = [],
    onChange,
    maxFiles = 10,
    onFilesExcess,
  } = props;
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = `media-uploader-${type}-${useId()}`;
  const imageUrls = type === "image" ? (urls as UploadedImage[]) : EMPTY_IMAGE_URLS;
  const audioUrls = type === "audio" ? (urls as string[]) : EMPTY_AUDIO_URLS;
  const imageOnChange = onChange as (urls: UploadedImage[]) => void;
  const audioOnChange = onChange as (urls: string[]) => void;
  const accept = type === "image" ? "image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif" : "audio/*";
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const incoming = Array.from(files);
      if (incoming.length === 0) return;
      if (type === "audio") {
        const limit = Math.max(0, maxFiles - audioUrls.length);
        const accepted = incoming.slice(0, limit);
        const excess = incoming.slice(limit);
        if (excess.length > 0) onFilesExcess?.(excess);
        if (accepted.length === 0) return;
        audioOnChange([...audioUrls, ...accepted.map((file) => URL.createObjectURL(file))]);
        return;
      }
      const limit = Math.max(0, maxFiles - imageUrls.length);
      const accepted = incoming.slice(0, limit);
      const excess = incoming.slice(limit);
      if (excess.length > 0) onFilesExcess?.(excess);
      if (accepted.length === 0) return;
      imageOnChange([...imageUrls, ...accepted.map(createLocalImage)]);
    },
    [audioOnChange, audioUrls, imageOnChange, imageUrls, maxFiles, onFilesExcess, type],
  );
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    handleFiles(files);
    event.target.value = "";
  };
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    handleFiles(event.dataTransfer.files);
  };
  const handleRemove = (index: number) => {
    if (type === "audio") {
      audioOnChange(audioUrls.filter((_, itemIndex) => itemIndex !== index));
      return;
    }
    imageOnChange(imageUrls.filter((_, itemIndex) => itemIndex !== index));
  };
  const isEmpty = type === "audio" ? audioUrls.length === 0 : imageUrls.length === 0;
  return (
    <div className="space-y-3">
      <input hidden id={inputId} ref={inputRef} type="file" accept={accept} multiple onChange={handleInputChange} />
      {!isEmpty && type === "image" ? (
        <div className="grid grid-cols-1 gap-2">
          {imageUrls.map((image, index) => {
            const imageUrl = getImageUrl(image);
            return (
              <div key={`${image.id}-${index}`} className="relative w-full overflow-hidden rounded-lg bg-white">
                {imageUrl ? <img src={imageUrl} alt={`Image ${index + 1}`} className="block w-full object-contain" /> : null}
                <Button type="button" variant="secondary" size="icon" className="absolute right-1 top-1 h-6 w-6 bg-white/90" onClick={() => handleRemove(index)} aria-label="画像を削除">
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
      {!isEmpty && type === "audio" ? (
        <div className="space-y-2">
          {audioUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="flex items-center gap-2">
              <audio controls src={url} className="min-w-0 flex-1" />
              <Button type="button" variant="secondary" size="icon" className="h-6 w-6" onClick={() => handleRemove(index)} aria-label="音声を削除">
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {(type === "audio" ? audioUrls.length : imageUrls.length) < maxFiles ? (
        <div
          className={`cursor-pointer rounded-[24px] border-2 border-dashed p-5 text-center transition-all duration-300 ${dragOver ? "border-indigo-400 bg-indigo-50/50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/30"}`}
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="select-none text-slate-400 transition-colors">
            <Upload className="mx-auto mb-2 h-6 w-6 opacity-60" />
            <p className="text-[10px] font-bold uppercase tracking-widest">ドラッグ＆ドロップ、クリック、または Ctrl+V で{type === "image" ? "画像を" : "音声を"}アップロード</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MediaUploader;
