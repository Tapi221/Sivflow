import { isDesktopLikeRuntime } from "@/platform/runtimeKind";



const LOCAL_TOKEN_KEY = "sivflow.gcal.access_token";
const LOCAL_TOKEN_EXPIRY_KEY = "sivflow.gcal.access_token_expiry";
const LOCAL_REFRESH_TOKEN_KEY = "sivflow.gcal.refresh_token";
const LEGACY_LOCAL_TOKEN_KEY = "flashcard-master.gcal.access_token";
const LEGACY_LOCAL_TOKEN_EXPIRY_KEY = "flashcard-master.gcal.access_token_expiry";
const LEGACY_LOCAL_REFRESH_TOKEN_KEY = "flashcard-master.gcal.refresh_token";
const PERSIST_EMAIL_KEY = "sivflow.gcal.account_email";
const PERSIST_CALENDAR_IDS_KEY = "sivflow.gcal.selected_calendar_ids";
const PERSIST_WAS_CONNECTED_KEY = "sivflow.gcal.was_connected";
const LEGACY_PERSIST_EMAIL_KEY = "flashcard-master.gcal.account_email";
const LEGACY_PERSIST_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const LEGACY_PERSIST_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;
let cachedToken: string | null = null;



const shouldStoreLocalRefreshToken = (): boolean => isDesktopLikeRuntime();
const readMigratedStorageItem = (key: string, legacyKey: string): string | null => {
  const current = localStorage.getItem(key);
  if (current !== null) return current;

  const legacy = localStorage.getItem(legacyKey);
  if (legacy === null) return null;

  localStorage.setItem(key, legacy);
  localStorage.removeItem(legacyKey);
  return legacy;
};
const removeStorageItemPair = (key: string, legacyKey: string): void => {
  localStorage.removeItem(key);
  localStorage.removeItem(legacyKey);
};
const readTokenExpiry = (): number | null => {
  try {
    const raw = readMigratedStorageItem(LOCAL_TOKEN_EXPIRY_KEY, LEGACY_LOCAL_TOKEN_EXPIRY_KEY);
    if (!raw) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};
const clearToken = (): void => {
  try {
    removeStorageItemPair(LOCAL_TOKEN_KEY, LEGACY_LOCAL_TOKEN_KEY);
    removeStorageItemPair(LOCAL_TOKEN_EXPIRY_KEY, LEGACY_LOCAL_TOKEN_EXPIRY_KEY);
    cachedToken = null;
  } catch {
  // ignore
  }
};
const readToken = (): string | null => {
  if (cachedToken) return cachedToken;

  try {
    const expiry = readMigratedStorageItem(LOCAL_TOKEN_EXPIRY_KEY, LEGACY_LOCAL_TOKEN_EXPIRY_KEY);

    if (expiry && Date.now() > Number(expiry)) {
      clearToken();
      return null;
    }

    const token = readMigratedStorageItem(LOCAL_TOKEN_KEY, LEGACY_LOCAL_TOKEN_KEY);
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
};
const writeToken = (token: string | null): void => {
  cachedToken = token;

  try {
    if (!token) {
      clearToken();
      return;
    }

    localStorage.setItem(LOCAL_TOKEN_KEY, token);
    localStorage.setItem(
      LOCAL_TOKEN_EXPIRY_KEY,
      String(Date.now() + TOKEN_LIFETIME_MS),
    );
    localStorage.removeItem(LEGACY_LOCAL_TOKEN_KEY);
    localStorage.removeItem(LEGACY_LOCAL_TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
};
const readRefreshToken = (): string | null => {
  try {
    if (!shouldStoreLocalRefreshToken()) {
      removeStorageItemPair(LOCAL_REFRESH_TOKEN_KEY, LEGACY_LOCAL_REFRESH_TOKEN_KEY);
      return null;
    }

    return readMigratedStorageItem(LOCAL_REFRESH_TOKEN_KEY, LEGACY_LOCAL_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};
const writeRefreshToken = (token: string | null): void => {
  try {
    if (!shouldStoreLocalRefreshToken() || !token) {
      removeStorageItemPair(LOCAL_REFRESH_TOKEN_KEY, LEGACY_LOCAL_REFRESH_TOKEN_KEY);
      return;
    }

    localStorage.setItem(LOCAL_REFRESH_TOKEN_KEY, token);
    localStorage.removeItem(LEGACY_LOCAL_REFRESH_TOKEN_KEY);
  } catch {
  // ignore
  }
};
const readEmail = (): string | null => {
  try {
    return readMigratedStorageItem(PERSIST_EMAIL_KEY, LEGACY_PERSIST_EMAIL_KEY);
  } catch {
    return null;
  }
};
const writeEmail = (email: string | null): void => {
  try {
    if (!email) {
      removeStorageItemPair(PERSIST_EMAIL_KEY, LEGACY_PERSIST_EMAIL_KEY);
      return;
    }
    localStorage.setItem(PERSIST_EMAIL_KEY, email);
    localStorage.removeItem(LEGACY_PERSIST_EMAIL_KEY);
  } catch {
  // ignore
  }
};
const readCalendarIds = (): string[] => {
  try {
    const raw = readMigratedStorageItem(PERSIST_CALENDAR_IDS_KEY, LEGACY_PERSIST_CALENDAR_IDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};
const writeCalendarIds = (ids: string[]): void => {
  try {
    localStorage.setItem(PERSIST_CALENDAR_IDS_KEY, JSON.stringify(ids));
    localStorage.removeItem(LEGACY_PERSIST_CALENDAR_IDS_KEY);
  } catch {
  // ignore
  }
};
const readWasConnected = (): boolean => {
  try {
    return readMigratedStorageItem(PERSIST_WAS_CONNECTED_KEY, LEGACY_PERSIST_WAS_CONNECTED_KEY) === "true";
  } catch {
    return false;
  }
};
const writeWasConnected = (value: boolean): void => {
  try {
    if (!value) {
      removeStorageItemPair(PERSIST_WAS_CONNECTED_KEY, LEGACY_PERSIST_WAS_CONNECTED_KEY);
      return;
    }
    localStorage.setItem(PERSIST_WAS_CONNECTED_KEY, "true");
    localStorage.removeItem(LEGACY_PERSIST_WAS_CONNECTED_KEY);
  } catch {
  // ignore
  }
};



export { readToken, writeToken, readTokenExpiry, clearToken, readRefreshToken, writeRefreshToken, readEmail, writeEmail, readCalendarIds, writeCalendarIds, readWasConnected, writeWasConnected };
