import { isDesktopLikeRuntime } from "@/platform/runtimeKind";

/**
 * gcal.multi-storage.ts
 *
 * 複数 Google アカウントの認証情報を localStorage で管理する。
 * 既存の単一アカウント形式からの自動マイグレーションも行う。
 */

// ─────────────────────────────────────────────────────────────
// Keys
// ─────────────────────────────────────────────────────────────

const MULTI_ACCOUNTS_KEY = "flashcard-master.gcal.accounts.v2";
const TOKEN_LIFETIME_MS = 55 * 60 * 1000;
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;

// Legacy keys（マイグレーション用）
const LEGACY_ACCESS_TOKEN_KEY = "flashcard-master.gcal.access_token";
const LEGACY_ACCESS_TOKEN_EXPIRY_KEY =
  "flashcard-master.gcal.access_token_expiry";
const LEGACY_REFRESH_TOKEN_KEY = "flashcard-master.gcal.refresh_token";
const LEGACY_EMAIL_KEY = "flashcard-master.gcal.account_email";
const LEGACY_CALENDAR_IDS_KEY = "flashcard-master.gcal.selected_calendar_ids";
const LEGACY_WAS_CONNECTED_KEY = "flashcard-master.gcal.was_connected";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type StoredGoogleAccount = {
  /** メールアドレス or ランダムUUID（メール不明時） */
  id: string;
  email: string | null;
  name?: string | null;
  photoUrl?: string | null;
  accessToken: string | null;
  accessTokenExpiry: number | null;
  refreshToken: string | null;
  selectedCalendarIds: string[];
  cachedCalendars?: { id: string; summary: string; backgroundColor?: string }[];
};

export type StoredGoogleAccountProfile = {
  name?: string | null;
  photoUrl?: string | null;
};

// ─────────────────────────────────────────────────────────────
// Token validity
// ─────────────────────────────────────────────────────────────

export const isStoredTokenValid = (account: StoredGoogleAccount): boolean => {
  if (!account.accessToken) return false;
  // expiry が null = レガシーデータ。有効として扱う（再接続時に刷新）
  if (account.accessTokenExpiry === null) return true;
  return Date.now() < account.accessTokenExpiry;
};

export const buildTokenExpiry = (expiresInSeconds?: number | null): number => {
  if (!expiresInSeconds) {
    return Date.now() + TOKEN_LIFETIME_MS;
  }

  return Date.now() + Math.max(0, expiresInSeconds * 1000 - TOKEN_EXPIRY_SAFETY_MARGIN_MS);
};

const shouldStripLocalRefreshTokens = (): boolean => {
  return !isDesktopLikeRuntime();
};

const stripLocalRefreshTokensOutsideDesktop = (
  accounts: StoredGoogleAccount[],
): StoredGoogleAccount[] => {
  if (!shouldStripLocalRefreshTokens()) return accounts;

  return accounts.map((account) =>
    account.refreshToken === null ? account : { ...account, refreshToken: null },
  );
};

const hasLocalRefreshToken = (accounts: StoredGoogleAccount[]): boolean => {
  return accounts.some((account) => account.refreshToken !== null);
};

// ─────────────────────────────────────────────────────────────
// Legacy migration
// ─────────────────────────────────────────────────────────────

const migrateFromLegacy = (): StoredGoogleAccount[] => {
  try {
    const wasConnected =
      localStorage.getItem(LEGACY_WAS_CONNECTED_KEY) === "true";
    if (!wasConnected) return [];

    const email = localStorage.getItem(LEGACY_EMAIL_KEY);
    const accessToken = localStorage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    const expiryRaw = localStorage.getItem(LEGACY_ACCESS_TOKEN_EXPIRY_KEY);
    const accessTokenExpiry = expiryRaw ? Number(expiryRaw) : null;
    const refreshToken = shouldStripLocalRefreshTokens()
      ? null
      : localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    const calIdsRaw = localStorage.getItem(LEGACY_CALENDAR_IDS_KEY);
    const selectedCalendarIds: string[] = calIdsRaw
      ? (JSON.parse(calIdsRaw) as string[])
      : [];

    if (!refreshToken && !accessToken) return [];

    const account: StoredGoogleAccount = {
      id: email ?? `account-${Date.now()}`,
      email,
      name: null,
      photoUrl: null,
      accessToken,
      accessTokenExpiry,
      refreshToken,
      selectedCalendarIds,
    };

    const accounts = stripLocalRefreshTokensOutsideDesktop([account]);

    writeStoredAccounts(accounts);
    console.info(
      "[gcal.multi-storage] Migrated single account to multi format",
    );
    return accounts;
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────

export const readStoredAccounts = (): StoredGoogleAccount[] => {
  try {
    const raw = localStorage.getItem(MULTI_ACCOUNTS_KEY);
    if (!raw) return migrateFromLegacy();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const accounts = parsed as StoredGoogleAccount[];
    const sanitizedAccounts = stripLocalRefreshTokensOutsideDesktop(accounts);

    if (hasLocalRefreshToken(accounts) && shouldStripLocalRefreshTokens()) {
      writeStoredAccounts(sanitizedAccounts);
    }

    return sanitizedAccounts;
  } catch {
    return [];
  }
};

export const writeStoredAccounts = (accounts: StoredGoogleAccount[]): void => {
  try {
    localStorage.setItem(
      MULTI_ACCOUNTS_KEY,
      JSON.stringify(stripLocalRefreshTokensOutsideDesktop(accounts)),
    );
  } catch {
    // ignore quota errors
  }
};

export const upsertStoredAccount = (account: StoredGoogleAccount): void => {
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    accounts[idx] = account;
  } else {
    accounts.push(account);
  }
  writeStoredAccounts(accounts);
};

export const removeStoredAccount = (accountId: string): void => {
  writeStoredAccounts(readStoredAccounts().filter((a) => a.id !== accountId));
};

export const updateStoredAccountToken = (
  accountId: string,
  accessToken: string,
  refreshToken?: string | null,
  profile?: StoredGoogleAccountProfile,
  expiresInSeconds?: number | null,
): void => {
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx < 0) return;

  accounts[idx] = {
    ...accounts[idx],
    accessToken,
    accessTokenExpiry: buildTokenExpiry(expiresInSeconds),
    ...(refreshToken !== undefined ? { refreshToken } : {}),
    ...(profile?.name ? { name: profile.name } : {}),
    ...(profile?.photoUrl ? { photoUrl: profile.photoUrl } : {}),
  };
  writeStoredAccounts(accounts);
};

export const updateStoredAccountCalendarIds = (
  accountId: string,
  selectedCalendarIds: string[],
): void => {
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx < 0) return;
  accounts[idx] = { ...accounts[idx], selectedCalendarIds };
  writeStoredAccounts(accounts);
};