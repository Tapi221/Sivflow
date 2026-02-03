import { nanoid } from 'nanoid';
import type { UploadMetadata } from '../types';

const ALLOWED_EXTENSIONS: Record<string, string[]> = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'avif', 'svg'],
  audio: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'],
  document: ['pdf', 'txt', 'md'],
};

/**
 * ファイル拡張子の検証と取得
 */
export const getValidatedExtension = (filename: string, expectedType?: string): string => {
  const parts = filename.toLowerCase().split('.');
  if (parts.length < 2) return 'bin';
  
  const ext = parts[parts.length - 1];
  
  // タイプ指定がある場合は検証
  if (expectedType) {
    const allowedExts = ALLOWED_EXTENSIONS[expectedType] || [];
    return allowedExts.includes(ext) ? ext : 'bin';
  }
  
  // すべての許可された拡張子をチェック
  const allAllowed = Object.values(ALLOWED_EXTENSIONS).flat();
  return allAllowed.includes(ext) ? ext : 'bin';
};

/**
 * 安全なストレージパスの生成
 */
export const generateSafeStoragePath = (
  originalName: string, 
  fileType?: string
): { safeName: string; extension: string; id: string } => {
  const extension = getValidatedExtension(originalName, fileType);
  const id = nanoid(10); 
  const safeName = `${Date.now()}_${id}.${extension}`;
  
  return { safeName, extension, id };
};

/**
 * メタデータの準備（Storage URL取得前）
 */
export const prepareUploadMetadata = (
  file: File,
  context: UploadMetadata['context'],
  userId: string
): Omit<UploadMetadata, 'downloadUrl' | 'uploadedAt' | 'id'> => {
  return {
    originalFilename: file.name,
    storagePath: '', // 後で設定
    mimeType: file.type,
    sizeBytes: file.size,
    context,
    userId,
    status: 'uploading',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
  };
};

/**
 * バイト数を読みやすい形式にフォーマット
 */
export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
