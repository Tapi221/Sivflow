const LOCAL_MEDIA_URL_PREFIX = 'sivflow-local-image:';
const LOCAL_PLATE_MEDIA_USER_ID = 'plate-note';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const decodeLocalMediaId = (value: string): string | null => {
  try {
    const decoded = decodeURIComponent(value);
    return isNonEmptyString(decoded) ? decoded : null;
  } catch {
    return isNonEmptyString(value) ? value : null;
  }
};

const createLocalMediaUrl = (localBlobId: string): string => `${LOCAL_MEDIA_URL_PREFIX}${encodeURIComponent(localBlobId.trim())}`;

const parseLocalMediaUrl = (url: unknown): string | null => {
  if (!isNonEmptyString(url)) return null;
  if (!url.startsWith(LOCAL_MEDIA_URL_PREFIX)) return null;
  return decodeLocalMediaId(url.slice(LOCAL_MEDIA_URL_PREFIX.length));
};

export { LOCAL_PLATE_MEDIA_USER_ID, createLocalMediaUrl, parseLocalMediaUrl };
