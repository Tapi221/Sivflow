import { isDesktopLikeRuntime } from "@/platform/runtimeKind";

// ─────────────────────────────────────────────
// keys
// ─────────────────────────────────────────────

const LOCAL_TOKEN_KEY = "flashcard-master.gcal.access_token";
const LOCAL_TOKEN_EXPIRY_KEY = "flashcard-master.gcal.access_token_expiry";
const LOCAL_REFRESH_TOKEN_KEY = "flashcard-master.gcal.refresh_token";

const PERSIST_EMAIL_KEY = "flashcard-master.gcal.account_email";
const PERSIST_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const PERSIST_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";

const TOKEN_LIFETIME_MS = 55 * 60 * 1000;

const shouldStoreLocalRefreshToken = (): boolean => isDesktopLikeRuntime();

// ─────────────────────────────────────────────
// internal cache
// ─────────────────────────────────────────────

let cachedToken: string | null = null;

// ─────────────────────────────────────────────
// token
// ─────────────────────────────────────────────

export const readToken = (): string | null => {
  if (cachedToken) return cachedToken;

  try {
    const expiry = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);

    if (expiry && Date.now() > Number(expiry)) {
      clearToken();
      return null;
    }

    const token = localStorage.getItem(LOCAL_TOKEN_KEY);
    cachedToken = token;
    return token;
  } catch {
    return null;
  }
};

export const writeToken = (token: string | null): void => {
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
  } catch {
    // ignore
  }
};

export const readTokenExpiry = (): number | null => {
  try {
    const raw = localStorage.getItem(LOCAL_TOKEN_EXPIRY_KEY);
    if (!raw) return null;

    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
};

export const clearToken = (): void => {
  try {
    localStorage.removeItem(LOCAL_TOKEN_KEY);
    localStorage.removeItem(LOCAL_TOKEN_EXPIRY_KEY);
    cachedToken = null;
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────
// refresh token
// ─────────────────────────────────────────────

export const readRefreshToken = (): string | null => {
  try {
    if (!shouldStoreLocalRefreshToken()) {
      localStorage.removeItem(LOCAL_REFRESH_TOKEN_KEY);
      return null;
    }

    return localStorage.getItem(LOCAL_REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const writeRefreshToken = (token: string | null): void => {
  try {
    if (!shouldStoreLocalRefreshToken() || !token) {
      localStorage.removeItem(LOCAL_REFRESH_TOKEN_KEY);
      return;
    }

    localStorage.setItem(LOCAL_REFRESH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────
// email
// ─────────────────────────────────────────────

export const readEmail = (): string | null => {
  try {
    return localStorage.getItem(PERSIST_EMAIL_KEY);
  } catch {
    return null;
  }
};

export const writeEmail = (email: string | null): void => {
  try {
    if (!email) {
      localStorage.removeItem(PERSIST_EMAIL_KEY);
      return;
    }
    localStorage.setItem(PERSIST_EMAIL_KEY, email);
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────
// calendar ids
// ─────────────────────────────────────────────

export const readCalendarIds = (): string[] => {
  try {
    const raw = localStorage.getItem(PERSIST_CALENDAR_IDS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
};

export const writeCalendarIds = (ids: string[]): void => {
  try {
    localStorage.setItem(PERSIST_CALENDAR_IDS_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
};

// ─────────────────────────────────────────────
// connection flag
// ─────────────────────────────────────────────

export const readWasConnected = (): boolean => {
  try {
    return localStorage.getItem(PERSIST_WAS_CONNECTED_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeWasConnected = (value: boolean): void => {
  try {
    if (!value) {
      localStorage.removeItem(PERSIST_WAS_CONNECTED_KEY);
      return;
    }
    localStorage.setItem(PERSIST_WAS_CONNECTED_KEY, "true");
  } catch {
    // ignore
  }
};