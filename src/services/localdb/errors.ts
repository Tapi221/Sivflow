import { LOCALDB_ERROR_MESSAGE_LIMIT } from './constants';
import type { LocalDBFallbackReasonCode } from '../localDBRuntimeState';

export const safeStringifyError = (error: unknown): string => {
  try {
    if (!error) return 'unknown error';
    if (typeof error === 'string') return error;
    const maybeName = (error as any)?.name ? `${(error as any).name}: ` : '';
    const maybeMessage = (error as any)?.message ?? JSON.stringify(error);
    return `${maybeName}${String(maybeMessage)}`.slice(0, LOCALDB_ERROR_MESSAGE_LIMIT);
  } catch {
    return 'unknown error';
  }
};

export const extractErrorTexts = (error: any, collector: string[], depth = 0): void => {
  if (!error || depth > 4) return;
  const name = typeof error?.name === 'string' ? error.name : '';
  const message = typeof error?.message === 'string' ? error.message : '';
  const text = `${name} ${message}`.toLowerCase();
  if (text.trim()) collector.push(text);
  extractErrorTexts(error?.inner, collector, depth + 1);
  extractErrorTexts(error?.cause, collector, depth + 1);
};

export function isBackingStoreOpenError(error: unknown): boolean {
  const texts: string[] = [];
  extractErrorTexts(error, texts);
  if (texts.length === 0) return false;
  const merged = texts.join(' | ');
  const hasUnknownError = merged.includes('unknownerror') || merged.includes('unknown error');
  const hasBackingStoreToken =
    merged.includes('opening backing store') ||
    merged.includes('backing store') ||
    merged.includes('indexeddb.open');
  return hasUnknownError && hasBackingStoreToken;
}

export const classifyFallbackReasonCode = (error: unknown): LocalDBFallbackReasonCode => {
  if (isBackingStoreOpenError(error)) return 'backing_store_open_error';

  const texts: string[] = [];
  extractErrorTexts(error, texts);
  const merged = texts.join(' | ');

  if (merged.includes('quotaexceeded') || merged.includes('quota exceeded')) {
    return 'quota_exceeded';
  }
  if (
    merged.includes('securityerror') ||
    merged.includes('access denied') ||
    merged.includes('not allowed') ||
    merged.includes('disabled')
  ) {
    return 'indexeddb_blocked';
  }
  if (
    merged.includes('blocked') ||
    merged.includes('versionchange') ||
    merged.includes('upgradeneeded')
  ) {
    return 'upgrade_needed_or_blocked';
  }
  return 'unknown';
};
