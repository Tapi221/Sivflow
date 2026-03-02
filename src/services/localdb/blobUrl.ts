import { findBlobUrlFixesDeep } from '@/utils/blobUrlSanitizer';
import { telemetryOncePerSession } from '../localDBRuntimeState';

export const safeRevokeBlobUrl = (url: unknown, context: string): void => {
  if (typeof url !== 'string' || !url.startsWith('blob:')) return;
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.warn(`[LocalDB] Failed to revoke blob URL (${context})`, error);
  }
};

export const hasBlobUrlDeep = (value: unknown): boolean => {
  return findBlobUrlFixesDeep(value).length > 0;
};

export class InvalidImageUrlError extends Error {
  entityType?: string;
  entityId?: string;
  path?: string;

  constructor(params: { entityType?: string; entityId?: string; path?: string; message?: string }) {
    const details = [
      params.message ?? '画像の保存形式が不正です。blob: URL は保存できません。',
      params.entityType ? `entityType=${params.entityType}` : null,
      params.entityId ? `id=${params.entityId}` : null,
      params.path ? `path=${params.path}` : null,
    ]
      .filter(Boolean)
      .join(' ');
    super(details);
    this.name = 'InvalidImageUrlError';
    this.entityType = params.entityType;
    this.entityId = params.entityId;
    this.path = params.path;
  }
}

export const assertNoBlobUrlInCardPayload = (
  cardLike: unknown,
  context?: { entityType?: string; entityId?: string }
) => {
  if (!cardLike || typeof cardLike !== 'object') return;
  const fixes = findBlobUrlFixesDeep(cardLike);
  if (fixes.length === 0) return;

  telemetryOncePerSession('cards:blob-url-persist-blocked');
  const firstFix = fixes[0];
  throw new InvalidImageUrlError({
    message: '画像の保存形式が不正です。blob: URL は保存できません。',
    entityType: context?.entityType ?? 'card',
    entityId:
      context?.entityId ??
      ((cardLike as any)?.id ? String((cardLike as any).id) : undefined),
    path: firstFix.path || '<root>',
  });
};

export const scrubBlobUrlsDeep = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return value.startsWith('blob:') ? null : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubBlobUrlsDeep(entry));
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      result[key] = scrubBlobUrlsDeep(nested);
    }
    return result;
  }
  return value;
};

export const setNestedPath = (target: Record<string, unknown>, path: string, value: unknown): void => {
  const keys = path.split('.');
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const key = keys[i];
    const current = cursor[key];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
};

export const buildCardCandidateFromMods = (obj: unknown, mods: unknown): unknown => {
  if (!obj || typeof obj !== 'object') return mods;
  if (!mods || typeof mods !== 'object') return obj;
  const candidate = { ...(obj as Record<string, unknown>) };
  for (const [key, value] of Object.entries(mods as Record<string, unknown>)) {
    if (key.includes('.')) {
      setNestedPath(candidate, key, value);
    } else {
      candidate[key] = value;
    }
  }
  return candidate;
};
