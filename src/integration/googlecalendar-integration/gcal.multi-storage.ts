import { clearCachedGoogleCalendarAccount } from "./googleCalendarEventCache";
import { isDesktopLikeRuntime } from "@/platform/runtimeKind";



// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type StoredGoogleAccount = {
  /** メールアドレス or ランダムUUID（メール不明時） */ id: string;
  email: string | null;
  name?: string | null;
  photoUrl?: string | null;
  accessToken: string | null;
  accessTokenExpiry: number | null;
  refreshToken: string | null;
  selectedCalendarIds: string[];
  cachedCalendars?: { id: string; summary: string; backgroundColor?: string; }[];
};
type StoredGoogleAccountProfile = {
  name?: string | null;
  photoUrl?: string | null;
};



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
const pendingLegacyDesktopRefreshTokens = new Map<string, string>();



// ─────────────────────────────────────────────────────────────
// Token validity
// ─────────────────────────────────────────────────────────────
const isStoredTokenValid = (account: StoredGoogleAccount): boolean => {
  if (!account.accessToken) return false;
  // expiry が null = レガシーデータ。有効として扱う（再接続時に刷新）
  if (account.accessTokenExpiry === null) return true;
  return Date.now() < account.accessTokenExpiry;
};
const buildTokenExpiry = (expiresInSeconds?: number | null): number => {
  if (!expiresInSeconds) {
    return Date.now() + TOKEN_LIFETIME_MS;
  }

  return Date.now() + Math.max(0, expiresInSeconds * 1000 - TOKEN_EXPIRY_SAFETY_MARGIN_MS);
};
const shouldStripLocalRefreshTokensOnRead = (): boolean => {
  return !isDesktopLikeRuntime();
};
const shouldStripLocalRefreshTokensOnWrite = (): boolean => true;
const stripLocalRefreshTokens = (
  accounts: StoredGoogleAccount[],
  shouldStrip: boolean,
): StoredGoogleAccount[] => {
  if (!shouldStrip) return accounts;

  return accounts.map((account) =>
    account.refreshToken === null ? account : { ...account, refreshToken: null },
  );
};
const hasLocalRefreshToken = (accounts: StoredGoogleAccount[]): boolean => {
  return accounts.some((account) => account.refreshToken !== null);
};
const normalizeStoredEmail = (email: string | null | undefined): string | null => {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
};
const getStoredAccountMatchIndex = (
  accounts: StoredGoogleAccount[],
  account: Pick<StoredGoogleAccount, "id" | "email">,
): number => {
  const email = normalizeStoredEmail(account.email);

  return accounts.findIndex((stored) => {
    if (stored.id === account.id) return true;
    if (!email) return false;
    return normalizeStoredEmail(stored.email) === email;
  });
};
const mergeStoredAccounts = (
  current: StoredGoogleAccount,
  incoming: StoredGoogleAccount,
): StoredGoogleAccount => {
  const selectedCalendarIds = incoming.selectedCalendarIds.length > 0
    ? incoming.selectedCalendarIds
    : current.selectedCalendarIds;

  return {
    ...current,
    ...incoming,
    email: incoming.email ?? current.email,
    name: incoming.name ?? current.name ?? null,
    photoUrl: incoming.photoUrl ?? current.photoUrl ?? null,
    accessToken: incoming.accessToken ?? current.accessToken,
    accessTokenExpiry: incoming.accessTokenExpiry ?? current.accessTokenExpiry,
    refreshToken: incoming.refreshToken ?? current.refreshToken,
    selectedCalendarIds: Array.from(new Set(selectedCalendarIds)),
    cachedCalendars: incoming.cachedCalendars ?? current.cachedCalendars,
  };
};
const dedupeStoredAccounts = (
  accounts: StoredGoogleAccount[],
): StoredGoogleAccount[] => {
  const deduped: StoredGoogleAccount[] = [];

  for (const account of accounts) {
    const existingIndex = getStoredAccountMatchIndex(deduped, account);

    if (existingIndex >= 0) {
      deduped[existingIndex] = mergeStoredAccounts(deduped[existingIndex], account);
      continue;
    }

    deduped.push(account);
  }

  return deduped;
};
const hydratePendingLegacyDesktopRefreshTokens = (
  accounts: StoredGoogleAccount[],
): StoredGoogleAccount[] => {
  if (!isDesktopLikeRuntime()) return accounts;

  return accounts.map((account) => {
    if (account.refreshToken !== null) return account;

    const refreshToken = pendingLegacyDesktopRefreshTokens.get(account.id);
    return refreshToken ? { ...account, refreshToken } : account;
  });
};
const writeStoredAccounts = (accounts: StoredGoogleAccount[]): void => {
  try {
    localStorage.setItem(MULTI_ACCOUNTS_KEY, JSON.stringify(stripLocalRefreshTokens(dedupeStoredAccounts(accounts), shouldStripLocalRefreshTokensOnWrite())));
  } catch {
  // ignore quota errors
  }
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
    const refreshToken = localStorage.getItem(LEGACY_REFRESH_TOKEN_KEY);
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

    const accounts = [account];

    if (isDesktopLikeRuntime() && refreshToken) {
      pendingLegacyDesktopRefreshTokens.set(account.id, refreshToken);
      localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    }

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
const readStoredAccounts = (): StoredGoogleAccount[] => {
  try {
    const raw = localStorage.getItem(MULTI_ACCOUNTS_KEY);
    if (!raw) return migrateFromLegacy();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const accounts = parsed as StoredGoogleAccount[];
    const sanitizedAccounts = stripLocalRefreshTokens(accounts, shouldStripLocalRefreshTokensOnRead());
    const dedupedAccounts = dedupeStoredAccounts(sanitizedAccounts);
    const shouldPersistSanitizedAccounts = hasLocalRefreshToken(accounts) && shouldStripLocalRefreshTokensOnRead();
    const shouldPersistDedupedAccounts = dedupedAccounts.length !== sanitizedAccounts.length;

    if (shouldPersistSanitizedAccounts || shouldPersistDedupedAccounts) {
      writeStoredAccounts(dedupedAccounts);
    }

    return hydratePendingLegacyDesktopRefreshTokens(dedupedAccounts);
  } catch {
    return [];
  }
};
const upsertStoredAccount = (account: StoredGoogleAccount): void => {
  const accounts = readStoredAccounts();
  const idx = getStoredAccountMatchIndex(accounts, account);
  if (idx >= 0) {
    accounts[idx] = mergeStoredAccounts(accounts[idx], account);
  } else {
    accounts.push(account);
  }
  writeStoredAccounts(accounts);
};
const removeStoredAccount = (accountId: string): void => {
  writeStoredAccounts(readStoredAccounts().filter((a) => a.id !== accountId));
  void clearCachedGoogleCalendarAccount(accountId).catch((error) => {
    console.warn("[gcal.multi-storage] failed to clear cached calendar events", error);
  });
};
const updateStoredAccountToken = (accountId: string, accessToken: string, refreshToken?: string | null, profile?: StoredGoogleAccountProfile, expiresInSeconds?: number | null): void => {
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
const updateStoredAccountCalendarIds = (accountId: string, selectedCalendarIds: string[]): void => {
  const accounts = readStoredAccounts();
  const idx = accounts.findIndex((a) => a.id === accountId);
  if (idx < 0) return;
  accounts[idx] = { ...accounts[idx], selectedCalendarIds };
  writeStoredAccounts(accounts);
};



export { isStoredTokenValid, buildTokenExpiry, readStoredAccounts, writeStoredAccounts, upsertStoredAccount, removeStoredAccount, updateStoredAccountToken, updateStoredAccountCalendarIds };


export type { StoredGoogleAccount, StoredGoogleAccountProfile };
