import { Dexie } from 'dexie';
import { InMemoryLocalDB } from '../InMemoryLocalDB';
// NOTE: createLocalDBInternal import creates a circular dependency with LocalDB.ts.
// This is safe in ESM because both modules only use each other inside function bodies,
// never at module initialization time.
import { createLocalDBInternal } from './LocalDB';
import type { LocalDB } from './LocalDB';
import { isBackingStoreOpenError, safeStringifyError, classifyFallbackReasonCode } from './errors';
import {
  getFallbackDatabaseNameForUser,
  bumpGenerationForUser as _bumpGenerationForUser,
  deleteUserPersistentDatabases,
} from './generation';
import {
  getStoredLocalDBResetFailureReason,
  markLocalDBGenerationBumped,
  saveLocalDBResetFailureReason,
  updateLocalDBRuntimeStatus,
  warnOncePerSession,
} from '../localDBRuntimeState';
import type { LocalDBInstance, LocalDBLike } from './types';

// --- シングルトン状態 ---
let instance: LocalDBInstance | null = null;
let currentUserId: string | null = null;
let openingPromise: Promise<LocalDBInstance> | null = null;
let openingUserId: string | null = null;
let resettingPromise: Promise<void> | null = null;
let persistentOpenDisabled = false;
const fallbackInstances = new Map<string, InMemoryLocalDB>();
let cachedInstance: LocalDBInstance | null = null;

// --- 内部ヘルパー ---

function activateFallback(userId: string, error: unknown): LocalDBInstance {
  let fallback = fallbackInstances.get(userId);
  if (!fallback) {
    fallback = new InMemoryLocalDB(userId, getFallbackDatabaseNameForUser(userId));
    fallbackInstances.set(userId, fallback);
  }

  instance = fallback;
  currentUserId = userId;

  updateLocalDBRuntimeStatus({
    mode: 'fallback',
    userId,
    dbName: fallback.name,
    fallbackReason: safeStringifyError(error),
    fallbackReasonCode: classifyFallbackReasonCode(error),
    resetFailedReason: getStoredLocalDBResetFailureReason(),
  });

  warnOncePerSession(
    'localdb:fallback-mode',
    `[LocalDB] Running in fallback mode (non-persistent). Recovery guide: https://support.google.com/chrome/answer/2392709`
  );

  return fallback;
}

async function openPersistentDbWithRetry(db: LocalDB): Promise<void> {
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
}

// --- 公開 API ---

export function getInstanceUserId(): string | null {
  return currentUserId;
}

export async function getInstance(userId?: string): Promise<LocalDBInstance> {
  const nextUserId = userId || 'anonymous';

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
        warnOncePerSession('localdb:switch-close-failed', '[LocalDB] Failed to close previous instance while switching user.', closeError);
      } finally {
        instance = null;
        currentUserId = null;
      }
    }

    if (persistentOpenDisabled) {
      return activateFallback(nextUserId, new Error('Persistent IndexedDB is disabled in this session.'));
    }

    const persistentDb = createLocalDBInternal(nextUserId);

    try {
      await openPersistentDbWithRetry(persistentDb);
      if (persistentDb.isOpen()) {
        await persistentDb.normalizeDocumentBlobUrlsForSession();
      }
      instance = persistentDb;
      currentUserId = nextUserId;
      persistentOpenDisabled = false;

      updateLocalDBRuntimeStatus({
        mode: 'persistent',
        userId: nextUserId,
        dbName: persistentDb.name,
        fallbackReason: null,
        fallbackReasonCode: 'none',
        resetFailedReason: getStoredLocalDBResetFailureReason(),
      });

      return persistentDb;
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
          `IndexedDB backing store open failed: ${safeStringifyError(error)}`
        );
        warnOncePerSession(
          'localdb:backing-store-open-error',
          `[LocalDB] Fatal IndexedDB backing store error detected. Persistent mode disabled for this session. Recovery guide: https://support.google.com/chrome/answer/2392709`,
          error
        );
      } else {
        warnOncePerSession(
          'localdb:open-failed',
          '[LocalDB] IndexedDB open failed. Falling back to in-memory mode for this session.',
          error
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
}

export async function resetForLogout(userId?: string): Promise<void> {
  if (resettingPromise) {
    return resettingPromise;
  }

  const targetUserId = userId || currentUserId || 'anonymous';

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
        resetFailureReason = `clearAllData failed: ${safeStringifyError(error)}`;
      }

      try {
        if (activeInstance.isOpen()) {
          activeInstance.close();
        }
      } catch (error) {
        if (!resetFailureReason) {
          resetFailureReason = `close failed: ${safeStringifyError(error)}`;
        }
      }

      try {
        if (activeInstance instanceof InMemoryLocalDB) {
          await activeInstance.delete();
        } else {
          await Dexie.delete(activeInstance.name);
        }
      } catch (error) {
        if (!resetFailureReason) {
          resetFailureReason = `delete failed: ${safeStringifyError(error)}`;
        }
      }
    }

    const generationCleanupFailure = await deleteUserPersistentDatabases(targetUserId);
    if (!resetFailureReason && generationCleanupFailure) {
      resetFailureReason = generationCleanupFailure;
    }

    instance = null;
    currentUserId = null;
    cachedInstance = null;
    fallbackInstances.delete(targetUserId);
    persistentOpenDisabled = false;

    if (resetFailureReason) {
      saveLocalDBResetFailureReason(resetFailureReason);
      warnOncePerSession(
        'localdb:logout-reset-failed',
        `[LocalDB] Logout reset failed (best-effort): ${resetFailureReason}`
      );
    } else {
      saveLocalDBResetFailureReason(null);
    }

    updateLocalDBRuntimeStatus({
      mode: 'persistent',
      userId: null,
      dbName: null,
      fallbackReason: null,
      fallbackReasonCode: 'none',
    });
  })();

  try {
    await resettingPromise;
  } finally {
    resettingPromise = null;
  }
}

export function clearInstance(): void {
  if (instance) {
    try {
      if (instance.isOpen()) {
        instance.close();
      }
      console.log(`[LocalDB] Instance for ${currentUserId} cleared via clearInstance()`);
    } catch (e) {
      console.error('[LocalDB] Error closing instance during clear:', e);
    } finally {
      if (instance instanceof InMemoryLocalDB && currentUserId) {
        fallbackInstances.delete(currentUserId);
      }
      instance = null;
      currentUserId = null;
      cachedInstance = null;
    }
  }
}

export async function getLocalDb(userId?: string): Promise<LocalDBLike> {
  if (!cachedInstance || (userId && getInstanceUserId() !== userId)) {
    cachedInstance = await getInstance(userId);
  }
  return cachedInstance;
}

export function getLocalDbSync(): LocalDBLike {
  if (!cachedInstance) {
    throw new Error('[LocalDB] Database accessed before async initialization. Use await getLocalDb() first.');
  }
  return cachedInstance;
}

export async function initializeDB(userId: string): Promise<void> {
  await getLocalDb(userId);
}

export async function resetLocalDBForLogout(userId?: string): Promise<void> {
  await resetForLogout(userId);
}
