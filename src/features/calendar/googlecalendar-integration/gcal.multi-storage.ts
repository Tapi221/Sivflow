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
  accessToken: string | null;
  accessTokenExpiry: number | null;
  refreshToken: string | null;
  selectedCalendarIds: string[];
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

export const buildTokenExpiry = (): number => Date.now() + TOKEN_LIFETIME_MS;

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
    const refreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    const calIdsRaw = localStorage.getItem(LEGACY_CALENDAR_IDS_KEY);
    const selectedCalendarIds: string[] = calIdsRaw
      ? (JSON.parse(calIdsRaw) as string[])
      : [];

    if (!refreshToken && !accessToken) return [];

    const account: StoredGoogleAccount = {
      id: email ?? `account-${Date.now()}`,
      email,
      accessToken,
      accessTokenExpiry,
      refreshToken,
      selectedCalendarIds,
    };

    writeStoredAccounts([account]);
    console.info(
      "[gcal.multi-storage] Migrated single account to multi format",
    );
    return [account];
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
    return Array.isArray(parsed) ? (parsed as StoredGoogleAccount[]) : [];
  } catch {
    return [];
  }
};

export const writeStoredAccounts = (accounts: StoredGoogleAccount[]): void => {
  try {
    localStorage.setItem(MULTI_ACCOUNTS_KEY, JSON.stringify(accounts));
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
): void => {
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx < 0) return;

  accounts[idx] = {
    ...accounts[idx],
    accessToken,
    accessTokenExpiry: buildTokenExpiry(),
    ...(refreshToken !== undefined && refreshToken !== null
      ? { refreshToken }
      : {}),
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
