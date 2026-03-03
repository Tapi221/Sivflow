import { getLocalDb, getLocalDbSync } from './LocalDB';

type WindowWithLocalDbDevtools = Window & {
  dbDebug?: () => Promise<void>;
  __dbHelpers?: {
    addDebugFolder: (data: unknown) => Promise<unknown>;
    dump: () => Promise<void>;
    rawDB: () => Promise<unknown>;
  };
  auth?: {
    currentUser?: {
      uid?: unknown;
    };
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const getBoolean = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const getNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);

const toDateOrNow = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    // Invalid Date 回避
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

const getAuthUid = (w: WindowWithLocalDbDevtools): string | undefined => {
  const uid = w.auth?.currentUser?.uid;
  return typeof uid === 'string' ? uid : undefined;
};

export function installLocalDbDevtools(): void {
  if (typeof window === 'undefined') return;

  const w = window as WindowWithLocalDbDevtools;

  // Allow overwriting to prevent "Cannot set property... which has only a getter" errors
  try {
    Object.defineProperty(w, 'dbInstance', {
      get: () => {
        try {
          return getLocalDbSync();
        } catch {
          return null;
        }
      },
      set: (assigned: unknown) => {
        // No-op setter to handle unexpected assignments without crashing
        void assigned;
      },
      configurable: true,
      enumerable: false,
    });
  } catch (e) {
    console.warn('[LocalDB] Failed to define window.dbInstance', e);
  }

  // DevTools helper: call `dbDebug()` in Console to dump LocalDB and syncQueue
  w.dbDebug = async () => {
    console.group('--- LocalDB / syncQueue Debug ---');
    try {
      const db = await getLocalDb();

      console.log('DB name:', (db as { name?: unknown } | null | undefined)?.name);

      console.log('Folders:');
      try {
        const folders = await (db as unknown as { getAllFolders: () => Promise<unknown[]> }).getAllFolders();
        console.table(folders);
      } catch (e) {
        console.warn('Failed to read folders', e);
      }

      console.log('Cards:');
      try {
        const cards = await (db as unknown as { getAllCards: () => Promise<unknown[]> }).getAllCards();
        console.table(cards);
      } catch (e) {
        console.warn('Failed to read cards', e);
      }

      console.log('SyncQueue:');
      try {
        const rows = await (
          db as unknown as { syncQueue: { toArray: () => Promise<unknown[]> } }
        ).syncQueue.toArray();

        console.log('syncQueue rows length:', rows.length);
        console.table(rows);
      } catch (e) {
        console.warn('Failed to read syncQueue', e);
      }
    } catch (err) {
      console.error('dbDebug error', err);
    } finally {
      console.groupEnd();
    }
  };

  // DevTools helper methods
  w.__dbHelpers = {
    addDebugFolder: async (data: unknown) => {
      try {
        const db = await getLocalDb();

        const input = isRecord(data) ? data : {};

        const id = getString(input.id) ?? `debug-folder-${Date.now()}`;
        const userId = getString(input.userId) ?? getAuthUid(w) ?? 'debug-user';
        const folderName = getString(input.folderName) ?? getString(input.name) ?? 'DEBUG';

        const payload = {
          id,
          userId,
          folderName,
          parentFolderId: (input.parentFolderId ?? null) as unknown,
          folderColor: (input.folderColor ?? null) as unknown,
          cloudSyncEnabled: getBoolean(input.cloudSyncEnabled) ?? true,
          orderIndex: getNumber(input.orderIndex) ?? 0,
          createdAt: toDateOrNow(input.createdAt),
          updatedAt: toDateOrNow(input.updatedAt),
          isDeleted: getBoolean(input.isDeleted) ?? false,
        };

        console.log('[__dbHelpers] addDebugFolder -> payload', payload);

        const newId = await (db as unknown as { addItem: (table: string, item: unknown) => Promise<unknown> }).addItem(
          'folders',
          payload
        );

        console.log('[__dbHelpers] addDebugFolder SUCCESS id=', newId);
        return newId;
      } catch (e) {
        console.error('[__dbHelpers] addDebugFolder ERROR', e);
        throw e;
      }
    },

    dump: async () => {
      await w.dbDebug?.();
    },

    rawDB: async () => getLocalDb(),
  };
}