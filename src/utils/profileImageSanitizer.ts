import type { ProfileImage } from '@/types';

type SanitizeProfileImageResult = {
  profileImage: ProfileImage | null;
  wasBlobRemoteUrl: boolean;
};

const isBlobUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('blob:');

const toNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTimestampOrNow = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Date.now();
};

const toTimestampOrZero = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

export const sanitizeProfileImage = (input: unknown): SanitizeProfileImageResult => {
  if (!input || typeof input !== 'object') {
    return { profileImage: null, wasBlobRemoteUrl: false };
  }

  const record = input as Record<string, unknown>;
  const remoteUrlRaw = toNullableString(record.remoteUrl);
  const wasBlobRemoteUrl = isBlobUrl(remoteUrlRaw);
  const remoteUrl = wasBlobRemoteUrl ? null : remoteUrlRaw;
  const updatedAt = remoteUrl ? toTimestampOrNow(record.updatedAt) : toTimestampOrZero(record.updatedAt);

  return {
    profileImage: { remoteUrl, updatedAt },
    wasBlobRemoteUrl,
  };
};
