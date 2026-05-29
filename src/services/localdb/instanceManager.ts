import { deleteUserPersistentDatabases, getDatabaseNameForUser } from "./generation";
import { createInMemoryLocalDB, type InMemoryLocalDB } from "../InMemoryLocalDB";
import { LocalDB } from "./LocalDB";
import { clearLocalDBResetFailureReason, markLocalDBGenerationBumped, saveLocalDBResetFailureReason, updateLocalDBRuntimeStatus, warnOncePerSession } from "../localDBRuntimeState";
import type { LocalDBSyncStore } from "./types";

let instance: LocalDB | null = null;
let cachedInstance: LocalDB | InMemoryLocalDB | null = null;
let currentUserId: string | null = null;
let persistentOpenDisabled = false;
let resettingPromise: Promise<void> | null = null;

const fallbackInstances = new Map<string, InMemoryLocalDB>();
const generationBumps = new Map<string, number>();

const safeStringifyError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.stack || error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};

const getFallbackKey = (userId?: string): string => userId ?? "anonymous";

const bumpGenerationForUser = (userId: string): void => {
  generationBumps.set(userId, (generationBumps.get(userId) ?? 0) + 1);
};

const getFallbackInstance = async (userId?: string, reason?: unknown): Promise<InMemoryLocalDB> => {
  const key = getFallbackKey(userId);
  const existing = fallbackInstances.get(key);
  if (existing) return existing;

  const db = createInMemoryLocalDB(userId, `${getDatabaseNameForUser(userId)}_fallback`);
  fallbackInstances.set(key, db);
  cachedInstance = db;

  updateLocalDBRuntimeStatus({
    mode: "fallback",
    userId: userId ?? null,
    dbName: db.name,
    fallbackReason: reason === undefined ? null : safeStringifyError(reason),
    fallbackReasonCode: "unknown",
  });

  return db;
};

export const getLocalDb = (): LocalDB | InMemoryLocalDB | null => cachedInstance;

export const getLocalDbSync = (): LocalDBSyncStore | null => cachedInstance as LocalDBSyncStore | null;

export const getInstanceUserId = (): string | null => currentUserId;

export const getInstance = async (userId?: string): Promise<LocalDB | InMemoryLocalDB> => {
  const targetUserId = userId ?? "anonymous";

  if (resettingPromise) {
    await resettingPromise;
  }

  if (cachedInstance && currentUserId === targetUserId) {
    return cachedInstance;
  }

  if (persistentOpenDisabled) {
    currentUserId = targetUserId;
    return getFallbackInstance(targetUserId, "persistent-open-disabled");
  }

  try {
    clearLocalDBResetFailureReason();
    globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION = true;
    const db = new LocalDB(targetUserId);
    await db.open();
    instance = db;
    cachedInstance = db;
    currentUserId = targetUserId;
    updateLocalDBRuntimeStatus({
      mode: "persistent",
      userId: targetUserId,
      dbName: db.name,
      fallbackReason: null,
      fallbackReasonCode: "none",
      resetFailedReason: null,
    });
    return db;
  } catch (error) {
    warnOncePerSession(
      "localdb:persistent-open-failed",
      "[LocalDB] Failed to open persistent local database. Falling back to in-memory database.",
      error,
    );
    currentUserId = targetUserId;
    return getFallbackInstance(targetUserId, error);
  } finally {
    globalThis.__ALLOW_LOCAL_DB_CONSTRUCTION = false;
  }
};

export const initializeDB = async (userId?: string): Promise<LocalDB | InMemoryLocalDB> => {
  return getInstance(userId);
};

export const clearInstance = (): void => {
  if (instance) {
    try {
      instance.close();
    } catch {
      // ignore close failure
    }
  }

  instance = null;
  cachedInstance = null;
  currentUserId = null;
};

const resetForLogout = async (userId?: string): Promise<void> => {
  const targetUserId = userId ?? currentUserId ?? "anonymous";

  if (resettingPromise) {
    await resettingPromise;
    return;
  }

  resettingPromise = (async () => {
    let resetFailureReason: string | null = null;

    if (instance) {
      try {
        instance.close();
      } catch (error) {
        resetFailureReason = safeStringifyError(error);
        warnOncePerSession(
          "localdb:persistent-close-failed",
          "[LocalDB] Failed to close persistent local database during logout.",
          error,
        );
      }
      instance = null;
    }

    const fallback = fallbackInstances.get(targetUserId);
    if (fallback) {
      try {
        await fallback.clearAllData();
        fallback.close();
      } catch (error) {
        resetFailureReason = safeStringifyError(error);
        warnOncePerSession(
          "localdb:fallback-clear-failed",
          "[LocalDB] Failed to clear fallback local database during logout.",
          error,
        );
      }
      fallbackInstances.delete(targetUserId);
    }

    try {
      await deleteUserPersistentDatabases(targetUserId);
      persistentOpenDisabled = false;
      bumpGenerationForUser(targetUserId);
      markLocalDBGenerationBumped();
    } catch (error) {
      resetFailureReason = safeStringifyError(error);
      persistentOpenDisabled = true;
      saveLocalDBResetFailureReason(resetFailureReason);
      warnOncePerSession(
        "localdb:delete-user-db-failed",
        "[LocalDB] Failed to delete persistent local databases during logout.",
        error,
      );
    } finally {
      if (currentUserId === targetUserId) {
        instance = null;
        currentUserId = null;
      }
      cachedInstance = null;
      updateLocalDBRuntimeStatus({
        mode: resetFailureReason ? "fallback" : "persistent",
        userId: null,
        dbName: null,
        fallbackReason: resetFailureReason,
        fallbackReasonCode: resetFailureReason ? "unknown" : "none",
        resetFailedReason: resetFailureReason,
      });
    }
  })();

  try {
    await resettingPromise;
  } finally {
    resettingPromise = null;
  }
};

export const resetLocalDBForLogout = async (userId?: string) => {
  return resetForLogout(userId);
};
