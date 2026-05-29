import { Dexie } from "dexie";
import { classifyFallbackReasonCode, isBackingStoreOpenError, safeStringifyError } from "./errors";
import { bumpGenerationForUser as _bumpGenerationForUser, deleteUserPersistentDatabases, getFallbackDatabaseNameForUser } from "./generation";
import type { LocalDB } from "./LocalDB";
import { createLocalDBInternal } from "./LocalDB";
import type { LocalDBInstance } from "./types";
import { InMemoryLocalDB } from "@/services/InMemoryLocalDB";
import { getStoredLocalDBResetFailureReason, markLocalDBGenerationBumped, saveLocalDBResetFailureReason, updateLocalDBRuntimeStatus, warnOncePerSession } from "@/services/localDBRuntimeState";

let instance: LocalDBInstance | null = null;
let currentUserId: string | null = null;
let openingPromise: Promise<LocalDBInstance> | null = null;
let openingUserId: string | null = null;
let resettingPromise: Promise<void> | null = null;
let persistentOpenDisabled = false;
const fallbackInstances = new Map<string, InMemoryLocalDB>();
let cachedInstance: LocalDBInstance | null = null;

const asLocalDBInstance = (value: LocalDB | InMemoryLocalDB): LocalDBInstance => value as unknown as LocalDBInstance;

const activateFallback = (userId: string, error: unknown): LocalDBInstance => {
  let fallback = fallbackInstances.get(userId);
  if (!fallback) {
    fallback = new InMemoryLocalDB(
      userId,
      getFallbackDatabaseNameForUser(userId),
    );
    fallbackInstances.set(userId, fallback);
  }

  const fallbackInstance = asLocalDBInstance(fallback);
  instance = fallbackInstance;
  currentUserId = userId;

  updateLocalDBRuntimeStatus({
    mode: "fallback",
    userId,
    dbName: fallback.name,
    fallbackReason: safeStringifyError(error),
    fallbackReasonCode: classifyFallbackReasonCode(error),
    resetFailedReason: getStoredLocalDBResetFailureReason(),
  });

  warnOncePerSession(
    "localdb:fallback-mode",
    "[LocalDB] Running in fallback mode (non-persistent). Recovery guide: https://support.google.com/chrome/answer/2392709",
  );

  return fallbackInstance;
};

const openPersistentDbWithRetry = async (db: LocalDB) => {
  let attempt = 0;
  const maxAttempts = 2;
  let lastError: unknown = null;

  while (attempt < maxAttempts) {
    try {
      await db.open();
      return;
    } catch (error) {
      lastError = error;
      const fatalBackingStore = isBackingStoreOpenError(error);
      if (fatalBackingStore || attempt >= maxAttempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
    }
    attempt += 1;
  }

  throw lastError;
};

export const getInstanceUserId = () => {
  return currentUserId;
};

export const getInstance = async (userId?: string) => {
  const nextUserId = userId || "anonymous";

  if (resettingPromise) {
    await resettingPromise.catch(() => {
      // reset failure is handled in resetForLogout()
    });
  }

  if (instance && currentUserId === nextUserId) {
    return instance;
  }

  if (openingPromise && openingUserId === nextUserId) {
    return await openingPromise;
  }

  if (openingPromise && openingUserId !== nextUserId) {
    await openingPromise.catch(() => {
      // previous open failure is handled below
    });
    if (instance && currentUserId === nextUserId) {
      return instance;
    }
  }

  const openPromise = (async (): Promise<LocalDBInstance> => {
    if (instance && currentUserId !== nextUserId) {
      try {
        if (instance.isOpen()) {
          instance.close();
        }
      } catch (closeError) {
        warnOncePerSession(
          "localdb:switch-close-failed",
          "[LocalDB] Failed to close previous instance while switching user.",
          closeError,
        );
      } finally {
        instance = null;
        currentUserId = null;
      }
    }

    if (persistentOpenDisabled) {
      return activateFallback(
        nextUserId,
        new Error("Persistent IndexedDB is disabled in this session."),
      );
    }

    const persistentDb = createLocalDBInternal(nextUserId);

    try {
      await openPersistentDbWithRetry(persistentDb);
      if (persistentDb.isOpen()) {
        void persistentDb.normalizeDocumentBlobUrlsForSession();
      }
      const persistentInstance = asLocalDBInstance(persistentDb);
      instance = persistentInstance;
      currentUserId = nextUserId;
      persistentOpenDisabled = false;

      updateLocalDBRuntimeStatus({
        mode: "persistent",
        userId: nextUserId,
        dbName: persistentDb.name,
        fallbackReason: null,
        fallbackReasonCode: "none",
        resetFailedReason: getStoredLocalDBResetFailureReason(),
      });

      return persistentInstance;
    } catch (error) {
      try {
        if (persistentDb.isOpen()) {
          persistentDb.close();
        }
      } catch {
        // ignore close failures
      }

      const isFatal = isBackingStoreOpenError(error);
      if (isFatal) {
        _bumpGenerationForUser(nextUserId);
        markLocalDBGenerationBumped();
        saveLocalDBResetFailureReason(
          `IndexedDB backing store open failed: ${safeStringifyError(error)}`,
        );
        warnOncePerSession(
          "localdb:backing-store-open-error",
          "[LocalDB] Fatal IndexedDB backing store error detected. Persistent mode disabled for this session. Recovery guide: https://support.google.com/chrome/answer/2392709",
          error,
        );
      } else {
        warnOncePerSession(
          "localdb:open-failed",
          "[LocalDB] IndexedDB open failed. Falling back to in-memory mode for this session.",
          error,
        );
      }

      persistentOpenDisabled = true;
      return activateFallback(nextUserId, error);
    }
  })();

  openingPromise = openPromise;
  openingUserId = nextUserId;

  try {
    return await openPromise;
  } finally {
    if (openingPromise === openPromise) {
      openingPromise = null;
      openingUserId = null;
    }
  }
};

export const resetForLogout = async (userId?: string) => {
  if (resettingPromise) {
    return resettingPromise;
  }

  const targetUserId = userId || currentUserId || "anonymous";

  resettingPromise = (async () => {
    let resetFailureReason: string | null = null;

    if (openingPromise) {
      await openingPromise.catch(() => {
        // best-effort reset continues
      });
    }

    const activeInstance = instance;

    if (activeInstance) {
      try {
        await activeInstance.clearAllData();
      } catch (error) {
        resetFailureReason = safeStringifyError(error);
        warnOncePerSession(
          "localdb:clear-failed",
          "[LocalDB] Failed to clear active local database during logout.",
          error,
        );
      }

      try {
        if (activeInstance.isOpen()) activeInstance.close();
      } catch {
        // ignore close failure after clear attempt
      }
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
      _bumpGenerationForUser(targetUserId);
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
        mode: resetFailureReason ? "fallback" : "uninitialized",
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

export const getCachedInstance = () => cachedInstance;

export const setCachedInstance = (nextInstance: LocalDBInstance | null) => {
  cachedInstance = nextInstance;
};

export const deleteAllLocalDatabases = async () => {
  await Dexie.delete("flashcard-master");
  fallbackInstances.clear();
  instance = null;
  currentUserId = null;
  cachedInstance = null;
};
