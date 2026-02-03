import type { UploadSource, UploadFallbackReason } from '@/types';
import type { BlobUrl, Base64DataUrl } from '@/types/branded';
import { createBlobUrl, createBase64DataUrl } from '@/types/branded';

/**
 * 画像を圧縮してBase64 data URLに変換（内部使用のみ）
 * 
 * ⚠️ 警告: この関数は内部処理でのみ使用すること
 * - DB や UploadedImage に Base64 を保存してはならない
 * - 外部からは compressImageToBlob を使用すること
 * 
 * @internal
 */
const compressAndConvertToBase64Internal = (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Base64DataUrl> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // 画像サイズを計算
        let width = img.width;
        let height = img.height;
        
        // 最大サイズを超えている場合はリサイズ
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        // Canvasで画像を描画して圧縮
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG形式でBase64に変換（PNGの場合は透過を保持）
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mimeType, quality);
        
        resolve(createBase64DataUrl(dataUrl));
      };
      
      img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsDataURL(file);
  });
};

/**
 * 画像を圧縮して Blob に変換（推奨）
 * Base64 を経由するが、最終的に Blob を返すため安全
 */
export const compressImageToBlob = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<Blob> => {
  const base64 = await compressAndConvertToBase64Internal(file, maxWidth, maxHeight, quality);
  const response = await fetch(base64);
  return response.blob();
};

/**
 * 画像を圧縮して Blob URL に変換（UI プレビュー用）
 * 
 * ⚠️ 注意: 返された Blob URL は使用後に必ず revokeBlobUrl で解放すること
 */
export const compressImageToBlobUrl = async (
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.8
): Promise<BlobUrl> => {
  const blob = await compressImageToBlob(file, maxWidth, maxHeight, quality);
  const url = URL.createObjectURL(blob);
  return createBlobUrl(url);
};

/**
 * アップロードされた画像リストから Blob URL を削除してサニタイズする
 * (永続化前に呼び出すことで、有効期限切れの Blob URL 保存を防止する)
 */
export const sanitizeUploadedImages = (images: any[]) => {
  if (!Array.isArray(images)) return [];
  return images.map(img => {
    if (img && typeof img.localUrl === 'string' && img.localUrl.startsWith('blob:')) {
      return { ...img, localUrl: null };
    }
    return img;
  });
};

/**
 * @deprecated 後方互換性のため残すが、compressImageToBlob を使用すること
 * 
 * @internal
 */
export const compressAndConvertToBase64 = compressAndConvertToBase64Internal;

/**
 * @deprecated uploadImageAsBase64 は非推奨。compressImageToBlob を使用すること
 */
export const uploadImageAsBase64 = async (file: File): Promise<string> => {
  return compressAndConvertToBase64Internal(file);
};

export type NormalizeUploadedImageOptions = {
  onInvalid?: 'skip' | 'throw';
};

export type DenormalizeUploadedImageOptions = {
  case?: 'camel' | 'snake';
  stripUndefined?: boolean;
};

const generateUploadedImageId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const createUploadedImage = (file: File) => {
  return {
    id: generateUploadedImageId(),
    localUrl: URL.createObjectURL(file),
    remoteUrl: null,
    status: 'uploading' as const,
    contentType: file.type || null,
    size: Number.isFinite(file.size) ? file.size : null,
    storagePath: null,
  };
};

export const createFailedUploadedImage = (file: File) => {
  return {
    id: generateUploadedImageId(),
    localUrl: null,
    remoteUrl: null,
    status: 'failed' as const,
    contentType: file.type || null,
    size: Number.isFinite(file.size) ? file.size : null,
    storagePath: null,
  };
};

export const isHeicFile = (file: File) => {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  return type === 'image/heic' || type === 'image/heif' || name.endsWith('.heic') || name.endsWith('.heif');
};

export const convertHeicToJpeg = async (file: File): Promise<File> => {
  const heic2anyModule = await import('heic2any');
  const heic2any = (heic2anyModule as any).default || heic2anyModule;
  const result = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(result) ? result[0] : result;
  const name = file.name.replace(/\.(heic|heif)$/i, '.jpg');
  return new File([blob], name, { type: (blob as Blob).type || 'image/jpeg' });
};

const resolveString = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return undefined;
};

const resolveNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const pickFirst = (obj: Record<string, unknown>, keys: string[]): unknown => {
  for (const key of keys) {
    if (key in obj) return obj[key];
  }
  return undefined;
};

export const normalizeUploadedImage = (
  raw: unknown,
  options: NormalizeUploadedImageOptions = {}
) => {
  if (raw == null) return null;

  if (typeof raw === 'string') {
    return {
      id: generateUploadedImageId(),
      remoteUrl: raw,
      status: 'ready' as const,
      localUrl: null,
      contentType: null,
      size: null,
      storagePath: null,
    };
  }

  if (typeof raw !== 'object') {
    if (options.onInvalid === 'throw') {
      throw new Error('Invalid UploadedImage input');
    }
    return null;
  }

  const record = raw as Record<string, unknown>;

  const remoteUrl = resolveString(pickFirst(record, ['remoteUrl', 'remote_url', 'url']));
  const localUrl = resolveString(pickFirst(record, ['localUrl', 'local_url']));
  const status = resolveString(pickFirst(record, ['status'])) as
    | 'uploading'
    | 'ready'
    | 'failed'
    | undefined;
  const contentType = resolveString(pickFirst(record, ['contentType', 'content_type', 'mimeType', 'mime_type']));
  const size = resolveNumber(pickFirst(record, ['size', 'sizeBytes', 'size_bytes']));
  const storagePath = resolveString(pickFirst(record, ['storagePath', 'storage_path', 'path']));

  const source = resolveString(pickFirst(record, ['source'])) as UploadSource | undefined;
  const fallbackReason = resolveString(pickFirst(record, ['fallbackReason', 'fallback_reason'])) as UploadFallbackReason | undefined;

  if (!remoteUrl && !localUrl) {
    if (options.onInvalid === 'throw') {
      throw new Error('UploadedImage missing url');
    }
    return null;
  }

  return {
    id: resolveString(pickFirst(record, ['id'])) ?? generateUploadedImageId(),
    localUrl: localUrl ?? null,
    remoteUrl: remoteUrl ?? null,
    status: status ?? (remoteUrl ? 'ready' : 'uploading'),
    contentType: contentType ?? null,
    size: size ?? null,
    storagePath: storagePath ?? null,
    source: source ?? (remoteUrl && !localUrl ? 'cloud' : null),
    fallbackReason: fallbackReason ?? null,
  };
};

export const normalizeUploadedImages = (
  raw: unknown,
  options: NormalizeUploadedImageOptions = {}
) => {
  if (raw == null) return [];
  const items = Array.isArray(raw) ? raw : [raw];
  return items
    .map((item) => normalizeUploadedImage(item, options))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
};

export const denormalizeUploadedImage = (
  image: {
    id: string;
    localUrl?: string | null;
    remoteUrl?: string | null;
    status: 'uploading' | 'ready' | 'failed';
    contentType?: string | null;
    size?: number | null;
    storagePath?: string | null;
  },
  options: DenormalizeUploadedImageOptions = {}
) => {
  const output: Record<string, unknown> = options.case === 'snake'
    ? {
        id: image.id,
        url: image.remoteUrl ?? image.localUrl ?? null,
        content_type: image.contentType ?? null,
        size: image.size ?? null,
        storage_path: image.storagePath ?? null,
        status: image.status,
      }
    : {
        id: image.id,
        url: image.remoteUrl ?? image.localUrl ?? null,
        contentType: image.contentType ?? null,
        size: image.size ?? null,
        storagePath: image.storagePath ?? null,
        status: image.status,
      };

  if (options.stripUndefined) {
    for (const key of Object.keys(output)) {
      if (output[key] === undefined) {
        delete output[key];
      }
    }
  }

  return output;
};

export const denormalizeUploadedImages = (
  images: Array<{
    id: string;
    localUrl?: string | null;
    remoteUrl?: string | null;
    status: 'uploading' | 'ready' | 'failed';
    contentType?: string | null;
    size?: number | null;
    storagePath?: string | null;
  }>,
  options: DenormalizeUploadedImageOptions = {}
) => {
  return images.map((image) => denormalizeUploadedImage(image, options));
};

// denormalize* の戻り値が将来的な Wire 相当
