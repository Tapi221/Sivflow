import { InMemoryLocalDB } from "@/services/InMemoryLocalDB";
import { migrateLegacyLocalDbBrandIfNeeded } from "./brandMigration";
import { deleteUserPersistentDatabases, getDatabaseNameForUser } from "./generation";
import { LocalDB } from "./LocalDB";
import type { LocalDBSyncStore } from "./types";
import { clearLocalDBResetFailureReason, markLocalDBGenerationBumped, saveLocalDBResetFailureReason, updateLocalDBRuntimeStatus, warnOncePerSession } from "@/services/localDBRuntimeState";



type LocalDbGlobal = typeof globalThis & {
  __ALLOW_LOCAL_DB_CONSTRUCTION?: boolean;
};



let instance: LocalDB | null = null;
let cachedInstance: LocalDB | InMemoryLocalDB | null = null;
let currentUserId: string | null = null;
let persistentOpenDisabled = false;
let resettingPromise: Promise<void> | null = null;
const fallbackInstances = new Map<string, InMemoryLocalDB>();
const generationBumps = new Map<string, number>();



const getLocalDbGlobal = (): LocalDbGlobal => globalThis as LocalDbGlobal;
const safeStringifyError = (error: unknown): string => {
  if (error instanceof Error) return error.stack || error.message;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
const getFallbackKey = (userId?: string): string => userId ?? "anonymous";
const isPersistentCachedInstance = (targetUserId: string): boolean => Boolean(instance && cachedInstance === instance && currentUserId === targetUserId);
const disposeFallbackInstance = (userId: string): void => {
  const fallback = fallbackInstances.get(userId);
  if (!fallback) return;

  try {
    fallback.close();
  } catch {
    // ignore fallback close failure
  }

  fallbackInstances.delete(userId);
  if (cachedInstance === fallback) cachedInstance = null;
};
const bumpGenerationForUser = (userId: string): void => {
  generationBumps.set(userId, (generationBumps.get(userId) ?? 0) + 1);
};
const createFallbackInstance = (userId?: string, reason?: unknown): InMemoryLocalDB => {
  const key = getFallbackKey(userId);
  const existing = fallbackInstances.get(key);
  if (existing) return existing;

  const db = new InMemoryLocalDB(userId, `${getDatabaseNameForUser(userId)}_fallback`);
  fallbackInstances.set(key, db);
  cachedInstance = db;
  currentUserId = userId ?? "anonymous";

  updateLocalDBRuntimeStatus({
    mode: "fallback",
    userId: userId ?? null,
    dbName: db.name,
    fallbackReason: reason === undefined ? null : safeStringifyError(reason),
    fallbackReasonCode: "unknown",
  });

  return db;
};
const getFallbackInstance = async (userId?: string, reason?: unknown): Promise<InMemoryLocalDB> => createFallbackInstance(userId, reason);
const getLocalDbSync = (userId?: string): LocalDBSyncStore => {
  const targetUserId = userId ?? currentUserId ?? "anonymous";
  if (cachedInstance && currentUserId === targetUserId) return cachedInstance as unknown as LocalDBSyncStore;
  return createFallbackInstance(targetUserId, "local-db-not-initialized") as unknown as LocalDBSyncStore;
};
const getInstanceUserId = (): string | null => currentUserId;
const getInstance = async (userId?: string): Promise<LocalDBSyncStore> => {
  const targetUserId = userId ?? "anonymous";

  if (resettingPromise) await resettingPromise;

  if (isPersistentCachedInstance(targetUserId)) {
    return cachedInstance as unknown as LocalDBSyncStore;
  }

  if (cachedInstance && currentUserId === targetUserId && cachedInstance !== instance && !persistentOpenDisabled) {
    disposeFallbackInstance(targetUserId);
  }

  if (persistentOpenDisabled) {
    currentUserId = targetUserId;
    return (await getFallbackInstance(targetUserId, "persistent-open-disabled")) as unknown as LocalDBSyncStore;
  }

  try {
    clearLocalDBResetFailureReason();
    const databaseName = getDatabaseNameForUser(targetUserId);
    await migrateLegacyLocalDbBrandIfNeeded(targetUserId, databaseName);
    getLocalDbGlobal().__ALLOW_LOCAL_DB_CONSTRUCTION = true;
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
    return db as unknown as LocalDBSyncStore;
  } catch (error) {
    warnOncePerSession(
      "localdb:persistent-open-failed",
      "[LocalDB] Failed to open persistent local database. Falling back to in-memory database.",
      error,
    );
    currentUserId = targetUserId;
    return (await getFallbackInstance(targetUserId, error)) as unknown as LocalDBSyncStore;
  } finally {
    getLocalDbGlobal().__ALLOW_LOCAL_DB_CONSTRUCTION = false;
  }
};
const getLocalDb = async (userId?: string): Promise<LocalDBSyncStore> => getInstance(userId);
const initializeDB = async (userId?: string): Promise<LocalDBSyncStore> => getInstance(userId);
const clearInstance = (): void => {
  if (instance) {
    try {
      instance.close();
    } catch {
      // ignore close failure
    }
  }

  for (const fallback of fallbackInstances.values()) {
    try {
      fallback.close();
    } catch {
    // ignore fallback close failure
    }
  }

  instance = null;
  cachedInstance = null;
  currentUserId = null;
  fallbackInstances.clear();
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
        await fallback.delete();
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
const resetLocalDBForLogout = async (userId?: string) => resetForLogout(userId);



export { getLocalDb, getLocalDbSync, getInstanceUserId, getInstance, initializeDB, clearInstance, resetForLogout, resetLocalDBForLogout };
