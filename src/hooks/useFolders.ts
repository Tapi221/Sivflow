import { useLiveQuery } from 'dexie-react-hooks';
import { Timestamp } from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { localDb, getLocalDb } from '../services/localDB'; // Unified LocalDB
import { useAuth } from '../contexts/AuthContext';
import type { Folder } from '../types';
import { normalizeFolder } from '../utils';
import { denormalizeUploadedImages } from '../utils/imageUtils';

export function useFolders() {
  const { currentUser } = useAuth();

  const folders = useLiveQuery(
    async () => {
      if (!currentUser) return [];
      const db = getLocalDb();
      console.log(`[Diagnostic] useFolders: Fetching from DB ${db.name}`);
      const rawFolders = await db.folders.toArray();

      console.log(`[Diagnostic] useFolders: TOTAL RAW RECORDS IN DEXIE = ${rawFolders.length}`);
      rawFolders.forEach((f, i) => {
          console.log(`[Dexie-Folder-${i}] ID=${f.id}, Name=${(f as any).folderName}, Deleted=${(f as any).isDeleted}/${(f as any).is_deleted}, User=${f.userId}`);
      });

      const filtered = rawFolders.filter(f => !((f as any).isDeleted ?? (f as any).is_deleted));
      console.log(`[Diagnostic] useFolders: Post-filter count = ${filtered.length}`);

      return filtered.map(normalizeFolder);
    },
    [currentUser?.uid, localDb?.name]
  );

  const createFolder = async (
    name: string, 
    parentId: string | null = null, 
    color?: string,
    cloudSyncEnabled: boolean = true
  ) => {
    if (!currentUser) throw new Error('認証が必要です');

    const db = getLocalDb();
    console.log('[Diagnostic] createFolder START. localDb instance type:', db?.constructor?.name);
    console.log('[createFolder] START', { folderName: name, parentId, dbName: db?.name });

    // orderIndexの設定
    const currentFolders = folders || []; 
    const siblings = currentFolders.filter((f) => f.parentFolderId === parentId);
    const orderIndex = siblings.length;

    const now = Timestamp.now();
    const folderData = {
      userId: currentUser.uid,
      folderName: name,
      parentFolderId: parentId,
      isDeleted: false,
      folderColor: color || null,
      cloudSyncEnabled,
      orderIndex,
      createdAt: now,
      updatedAt: now,
    };

    // 1. ローカル側で一意IDを生成（Firestore オブジェクトを誤って渡すバグ回避）
    const folderId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : (nanoid());

    // 2. LocalDBへ書き込み (Local First & Sync Queued)
    const localData = {
        ...folderData,
        id: folderId,
        folderId: folderId, // Ensure consistency
        createdAt: now.toDate(),
        updatedAt: now.toDate()
    };
    try {
      console.log('[createFolder] BEFORE_LOCALDB_ADD', { table: 'folders', folderId, dbName: db?.name });
      await db.addItem('folders', localData as any);
      console.log('[createFolder] AFTER_LOCALDB_ADD', { table: 'folders', folderId, status: 'success', dbName: db?.name });

      // Diagnostic: immediately read back the saved folder to verify it exists in the current DB instance
      try {
        const saved = await db.getItem('folders', folderId);
        console.log('[createFolder] VERIFY_SAVED_ITEM', { folderId, saved, dbName: db?.name });
      } catch (readErr) {
        console.error('[createFolder] VERIFY_SAVED_ITEM ERROR', { folderId, error: readErr });
      }
      return folderId;
    } catch (err) {
      console.error('[createFolder] ERROR during LocalDB add', { table: 'folders', folderId, error: err });
      throw err;
    }
  };

  const updateFolder = async (folderId: string, data: Partial<Folder>) => {
    if (!currentUser) throw new Error('認証が必要です');

    const now = Timestamp.now();
    const payload = {
      ...data,
      memoImages: data.memoImages ? denormalizeUploadedImages(data.memoImages, { case: 'camel', stripUndefined: true }) : undefined,
      updatedAt: now,
    } as any;

    if (payload.memoImages === undefined) {
      delete payload.memoImages;
    }

    // 1. LocalDB更新 (Local First & Sync Queued)
    await localDb.updateItem('folders', folderId, payload);
  };

  const reorderFolders = async (folderIds: string[], parentId: string | null = null) => {
    if (!currentUser) throw new Error('認証が必要です');

    const now = Timestamp.now();
    
    // 1. LocalDB Updates (Sync Queued for each)
    const updates = folderIds.map((folderId, index) => {
        return localDb.updateItem('folders', folderId, {
            orderIndex: index,
            updatedAt: now.toDate()
        });
    });
    await Promise.all(updates);
  };

  const deleteFolder = async (folderId: string) => {
    if (!currentUser) throw new Error('認証が必要です');
    
    const now = Timestamp.now();
    // 1. LocalDB softDelete (Sync Queued)
    await localDb.softDelete('folders', folderId);
    
    // Recursive delete
    const currentFolders = folders || [];
    const subfolders = currentFolders.filter(f => f.parentFolderId === folderId);
    for (const subfolder of subfolders) {
      await deleteFolder(subfolder.id);
    }
  };

  const getFolderTree = () => {
    const currentFolders = folders || [];
    const buildTree = (parentId: string | null): (Folder & { children: Folder[] })[] => {
      return currentFolders
        .filter((f) => f.parentFolderId === parentId)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
        .map((folder) => ({
          ...folder,
          children: buildTree(folder.folderId),
        }));
    };
    return buildTree(null);
  };

  return {
    folders: folders || [],
    loading: folders === undefined,
    error: null,
    createFolder,
    updateFolder,
    deleteFolder,
    reorderFolders,
    getFolderTree,
  };
}
