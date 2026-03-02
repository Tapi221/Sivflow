import { getLocalDb, getLocalDbSync } from './LocalDB';

export function installLocalDbDevtools(): void {
  if (typeof window === 'undefined') return;

  // Allow overwriting to prevent "Cannot set property... which has only a getter" errors
  try {
    Object.defineProperty(window, 'dbInstance', {
      get: () => {
        try { return getLocalDbSync(); } catch(e) { return null; }
      },
      set: (_) => {
        // No-op setter to handle unexpected assignments without crashing
      },
      configurable: true
    });
  } catch (e) {
     console.warn('[LocalDB] Failed to define window.dbInstance', e);
  }

  // DevTools helper: call `dbDebug()` in Console to dump LocalDB and syncQueue
  (window as any).dbDebug = async () => {
    console.group('--- LocalDB / syncQueue Debug ---');
    try {
      const db = await getLocalDb();
      console.log('DB name:', db?.name);
      console.log('Folders:');
      try { console.table(await db.getAllFolders()); } catch (e) { console.warn('Failed to read folders', e); }
      console.log('Cards:');
      try { console.table(await db.getAllCards()); } catch (e) { console.warn('Failed to read cards', e); }
      console.log('SyncQueue:');
      try {
        const rows = await db.syncQueue.toArray();
        console.log('syncQueue rows length:', rows?.length);
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
  (window as any).__dbHelpers = {
    addDebugFolder: async (data: any) => {
      try {
        const db = await getLocalDb();
        const payload = {
          id: data.id || 'debug-folder-' + Date.now(),
          userId: data.userId || ((window as any).auth?.currentUser?.uid === 'string' ? (window as any).auth.currentUser.uid : 'debug-user'),
          folderName: data.folderName || data.name || 'DEBUG',
          parentFolderId: data.parentFolderId ?? null,
          folderColor: data.folderColor ?? null,
          cloudSyncEnabled: data.cloudSyncEnabled ?? true,
          orderIndex: data.orderIndex ?? 0,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
          isDeleted: data.isDeleted ?? false
        };
        console.log('[__dbHelpers] addDebugFolder -> payload', payload);
        const id = await db.addItem('folders', payload as any);
        console.log('[__dbHelpers] addDebugFolder SUCCESS id=', id);
        return id;
      } catch (e) {
        console.error('[__dbHelpers] addDebugFolder ERROR', e);
        throw e;
      }
    },
    dump: async () => {
      return await (window as any).dbDebug();
    },
    rawDB: async () => await getLocalDb()
  };
}
