import { auth, requireFirestoreDb } from "@platform/firebase/client";
import { SHARED_STORAGE_KEYS } from "@platform/storage/storageKeys.constants";
import { WEB_STORAGE_KEYS } from "@platform/storage/webStorageKeys.constants";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { auditAndRepairTags } from "@/services/localdb/audit/tags";
import { getLocalDb, getLocalDbSync, LocalDB } from "./LocalDB";
import { LOCALDB_GENERATION_KEY_PREFIX, LOCALDB_GENERATION_MAX, LOCALDB_LEGACY_NAME_PREFIX, LOCALDB_NAME_PREFIX, LOCALDB_SCHEMA_VERSION_FOR_NAME } from "./localdb.constants";



type ClearDevModeCacheOptions = {
  userId?: string;
  reload?: boolean;
};
type ClearDevModeCacheResult = {
  userId: string | null;
  deletedIndexedDbNames: string[];
  failedIndexedDbNames: string[];
  removedLocalStorageKeys: string[];
  clearedSessionStorage: boolean;
  deletedCacheStorageKeys: string[];
  reloaded: boolean;
};
type ClearDevModeCache = (options?: string | ClearDevModeCacheOptions) => Promise<ClearDevModeCacheResult>;
type DeleteDefaultNewFoldersOptions = {
  userId?: string;
  names?: string[];
  includeLocal?: boolean;
  includeFirebase?: boolean;
  includeDeleted?: boolean;
  onlyEmpty?: boolean;
  dryRun?: boolean;
  reload?: boolean;
};
type DeleteDefaultNewFoldersResult = {
  userId: string | null;
  targetNames: string[];
  matchedLocalFolderIds: string[];
  deletedLocalFolderIds: string[];
  skippedNonEmptyLocalFolderIds: string[];
  matchedFirebaseFolderIds: string[];
  deletedFirebaseFolderIds: string[];
  skippedNonEmptyFirebaseFolderIds: string[];
  onlyEmpty: boolean;
  dryRun: boolean;
  reloaded: boolean;
};
type DeleteDefaultNewFolders = (options?: string | string[] | DeleteDefaultNewFoldersOptions) => Promise<DeleteDefaultNewFoldersResult>;
type StorageKeySource = Record<string, string | readonly string[]>;
type LocalReadonlyTable = {
  toArray: () => Promise<unknown[]>;
};
type LocalFolderTable = LocalReadonlyTable & {
  bulkDelete: (keys: string[]) => Promise<void>;
};
type FolderMatchResult = {
  matchedFolderIds: string[];
  skippedNonEmptyFolderIds: string[];
};
type FirestoreRecord = {
  id: string;
  data: Record<string, unknown>;
};
type WindowWithLocalDbDevtools = Window & {
  clearDevCache?: ClearDevModeCache;
  clearDevModeCache?: ClearDevModeCache;
  deleteDefaultNewFolders?: DeleteDefaultNewFolders;
  deleteNewFolders?: DeleteDefaultNewFolders;
  dbDebug?: () => Promise<void>;
  repairTags?: (userId?: string) => Promise<unknown>;
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



const REPAIR_TAGS_ALLOWLIST = (import.meta.env.VITE_REPAIR_TAGS_ALLOWLIST ?? import.meta.env.VITE_REPAIR_TAGS_ALLOWED_UIDS ?? "").split(",").map((uid) => uid.trim()).filter(Boolean);
const DEV_INDEXED_DB_DELETE_TIMEOUT_MS = 2000;
const DEFAULT_NEW_FOLDER_NAMES = ["新規フォルダ"] as const;
const DEV_LOCAL_STORAGE_PREFIXES = [LOCALDB_GENERATION_KEY_PREFIX, "sivflow:", "sivflow.", "flashcard-master:", "flashcard-master.", "cardsetview.", "card-view.", "card-editor.", "folder_", "ui.", "workspace.", "app:"] as const;
const DEV_LOCAL_STORAGE_EXTRA_KEYS = ["explorer-storage"] as const;



const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const getString = (value: unknown): string | undefined => typeof value === "string" ? value : undefined;
const getAuthUid = (w: WindowWithLocalDbDevtools): string | undefined => {
  const firebaseUid = auth.currentUser?.uid;
  if (typeof firebaseUid === "string" && firebaseUid.length > 0) return firebaseUid;

  const windowUid = w.auth?.currentUser?.uid;
  return typeof windowUid === "string" ? windowUid : undefined;
};
const assertRepairTagsAllowed = (userId: string): void => {
  if (REPAIR_TAGS_ALLOWLIST.length === 0) throw new Error("repairTags: forbidden");
  if (!REPAIR_TAGS_ALLOWLIST.includes(userId)) throw new Error("repairTags: forbidden");
};
const normalizeClearDevModeCacheOptions = (options?: string | ClearDevModeCacheOptions): Required<ClearDevModeCacheOptions> => {
  if (typeof options === "string") return { userId: options, reload: true };

  return { userId: options?.userId ?? "", reload: options?.reload ?? true };
};
const normalizeDeleteDefaultNewFoldersOptions = (options?: string | string[] | DeleteDefaultNewFoldersOptions): Required<DeleteDefaultNewFoldersOptions> => {
  if (typeof options === "string") return { userId: "", names: [options], includeLocal: true, includeFirebase: true, includeDeleted: false, onlyEmpty: true, dryRun: false, reload: true };
  if (Array.isArray(options)) return { userId: "", names: options, includeLocal: true, includeFirebase: true, includeDeleted: false, onlyEmpty: true, dryRun: false, reload: true };

  return { userId: options?.userId ?? "", names: options?.names ?? [...DEFAULT_NEW_FOLDER_NAMES], includeLocal: options?.includeLocal ?? true, includeFirebase: options?.includeFirebase ?? true, includeDeleted: options?.includeDeleted ?? false, onlyEmpty: options?.onlyEmpty ?? true, dryRun: options?.dryRun ?? false, reload: options?.reload ?? true };
};
const collectStorageKeys = (...sources: StorageKeySource[]): Set<string> => {
  const keys = new Set<string>(DEV_LOCAL_STORAGE_EXTRA_KEYS);

  for (const source of sources) {
    for (const value of Object.values(source)) {
      if (typeof value === "string") {
        keys.add(value);
        continue;
      }

      for (const key of value) keys.add(key);
    }
  }

  return keys;
};
const shouldRemoveLocalStorageKey = (key: string, exactKeys: ReadonlySet<string>): boolean => exactKeys.has(key) || DEV_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
const removeDevelopmentLocalStorageKeys = (): string[] => {
  if (typeof window === "undefined") return [];

  const exactKeys = collectStorageKeys(SHARED_STORAGE_KEYS, WEB_STORAGE_KEYS);
  const removedKeys: string[] = [];
  const keys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index)).filter((key): key is string => typeof key === "string");

  for (const key of keys) {
    if (!shouldRemoveLocalStorageKey(key, exactKeys)) continue;
    window.localStorage.removeItem(key);
    removedKeys.push(key);
  }

  return removedKeys;
};
const clearDevelopmentSessionStorage = (): boolean => {
  if (typeof window === "undefined") return false;

  window.sessionStorage.clear();
  return true;
};
const getKnownLocalDbNamesForUser = (userId: string): string[] => {
  const names: string[] = [];

  for (let generation = 0; generation <= LOCALDB_GENERATION_MAX; generation += 1) names.push(`${LOCALDB_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`, `${LOCALDB_LEGACY_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`);

  names.push(`${LOCALDB_NAME_PREFIX}${userId}`, `${LOCALDB_LEGACY_NAME_PREFIX}${userId}`);
  return names;
};
const listDevelopmentIndexedDbNames = async (userId: string | null): Promise<string[]> => {
  if (typeof indexedDB === "undefined") return [];

  const names = new Set<string>();
  const knownUserIds = new Set<string>(["anonymous"]);
  if (userId) knownUserIds.add(userId);

  for (const knownUserId of knownUserIds) {
    for (const name of getKnownLocalDbNamesForUser(knownUserId)) names.add(name);
  }

  if (typeof indexedDB.databases === "function") {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      const name = db?.name;
      if (!name?.startsWith(LOCALDB_NAME_PREFIX) && !name?.startsWith(LOCALDB_LEGACY_NAME_PREFIX)) continue;
      names.add(name);
    }
  }

  return Array.from(names.values());
};
const deleteIndexedDatabase = async (name: string): Promise<boolean> => {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return false;

  return await new Promise((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      console.warn(`[clearDevModeCache] IndexedDB delete timed out: ${name}`);
      resolve(false);
    }, DEV_INDEXED_DB_DELETE_TIMEOUT_MS);
    const finish = (deleted: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(deleted);
    };
    const request = indexedDB.deleteDatabase(name);

    request.onsuccess = () => finish(true);
    request.onerror = () => {
      console.warn(`[clearDevModeCache] IndexedDB delete failed: ${name}`, request.error);
      finish(false);
    };
    request.onblocked = () => {
      console.warn(`[clearDevModeCache] IndexedDB delete blocked: ${name}`);
    };
  });
};
const clearDevelopmentIndexedDbs = async (userId: string | null): Promise<Pick<ClearDevModeCacheResult, "deletedIndexedDbNames" | "failedIndexedDbNames">> => {
  LocalDB.clearInstance();

  const deletedIndexedDbNames: string[] = [];
  const failedIndexedDbNames: string[] = [];
  const names = await listDevelopmentIndexedDbNames(userId);

  for (const name of names) {
    const deleted = await deleteIndexedDatabase(name);
    if (deleted) {
      deletedIndexedDbNames.push(name);
      continue;
    }

    failedIndexedDbNames.push(name);
  }

  return { deletedIndexedDbNames, failedIndexedDbNames };
};
const clearDevelopmentCacheStorage = async (): Promise<string[]> => {
  if (typeof caches === "undefined") return [];

  const keys = await caches.keys();
  const deletedKeys: string[] = [];

  for (const key of keys) {
    const deleted = await caches.delete(key);
    if (deleted) deletedKeys.push(key);
  }

  return deletedKeys;
};
const getLocalTable = (db: unknown, tableName: string): LocalReadonlyTable | null => {
  const table = (db as Record<string, unknown>)[tableName];
  if (!isRecord(table)) return null;
  return typeof table.toArray === "function" ? (table as LocalReadonlyTable) : null;
};
const getFolderTable = (db: unknown): LocalFolderTable => (db as { folders: LocalFolderTable; }).folders;
const getTableItems = async (db: unknown, tableName: string): Promise<unknown[]> => {
  const table = getLocalTable(db, tableName);
  return table ? await table.toArray() : [];
};
const getFolderRecordId = (folder: unknown): string | null => {
  if (!isRecord(folder)) return null;
  const id = getString(folder.id) ?? getString(folder.folderId);
  return id && id.trim().length > 0 ? id : null;
};
const getFolderRecordName = (folder: unknown): string | null => {
  if (!isRecord(folder)) return null;
  return getString(folder.folderName) ?? getString(folder.folder_name) ?? getString(folder.name) ?? null;
};
const getFolderRecordParentId = (folder: unknown): string | null => {
  if (!isRecord(folder)) return null;
  return getString(folder.parentFolderId) ?? getString(folder.parent_folder_id) ?? null;
};
const getEntityFolderId = (entity: unknown): string | null => {
  if (!isRecord(entity)) return null;
  return getString(entity.folderId) ?? getString(entity.folder_id) ?? null;
};
const isFolderRecordDeleted = (folder: unknown): boolean => {
  if (!isRecord(folder)) return false;
  return folder.isDeleted === true || folder.is_deleted === true;
};
const getUniqueNames = (names: string[]): string[] => Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
const getFirebaseFolderRecords = async (userId: string): Promise<FirestoreRecord[]> => {
  const db = requireFirestoreDb();
  const foldersRef = collection(db, "users", userId, "folders");
  const snapshot = await getDocs(foldersRef);
  return snapshot.docs.map((folderDoc) => ({ id: folderDoc.id, data: folderDoc.data() }));
};
const getFirebaseEntityRecords = async (userId: string, collectionName: string): Promise<FirestoreRecord[]> => {
  const db = requireFirestoreDb();
  const entityRef = collection(db, "users", userId, collectionName);
  const snapshot = await getDocs(entityRef);
  return snapshot.docs.map((entityDoc) => ({ id: entityDoc.id, data: entityDoc.data() }));
};
const isFirebaseFolderEmpty = async (userId: string, folderId: string): Promise<boolean> => {
  const [cards, childFolders, documents] = await Promise.all([getFirebaseEntityRecords(userId, "cards"), getFirebaseEntityRecords(userId, "folders"), getFirebaseEntityRecords(userId, "documents")]);
  const hasCard = cards.some((card) => getEntityFolderId(card.data) === folderId);
  const hasChildFolder = childFolders.some((folder) => getFolderRecordParentId(folder.data) === folderId);
  const hasDocument = documents.some((document) => getEntityFolderId(document.data) === folderId);
  return !hasCard && !hasChildFolder && !hasDocument;
};
const getLocalFolderMatches = async (db: unknown, names: string[], includeDeleted: boolean, onlyEmpty: boolean): Promise<FolderMatchResult> => {
  const folders = await getTableItems(db, "folders");
  const cards = onlyEmpty ? await getTableItems(db, "cards") : [];
  const documents = onlyEmpty ? await getTableItems(db, "documents") : [];
  const matchedFolderIds: string[] = [];
  const skippedNonEmptyFolderIds: string[] = [];

  for (const folder of folders) {
    const id = getFolderRecordId(folder);
    const name = getFolderRecordName(folder);
    if (!id || !name || !names.includes(name)) continue;
    if (!includeDeleted && isFolderRecordDeleted(folder)) continue;

    const hasChildFolder = onlyEmpty && folders.some((candidate) => getFolderRecordParentId(candidate) === id);
    const hasCard = onlyEmpty && cards.some((card) => getEntityFolderId(card) === id);
    const hasDocument = onlyEmpty && documents.some((document) => getEntityFolderId(document) === id);
    if (hasChildFolder || hasCard || hasDocument) {
      skippedNonEmptyFolderIds.push(id);
      continue;
    }

    matchedFolderIds.push(id);
  }

  return { matchedFolderIds, skippedNonEmptyFolderIds };
};
const deleteLocalFolders = async (db: unknown, folderIds: string[]): Promise<string[]> => {
  if (folderIds.length === 0) return [];
  await getFolderTable(db).bulkDelete(folderIds);
  return folderIds;
};
const deleteFirebaseFolders = async (userId: string, folderIds: string[]): Promise<string[]> => {
  if (folderIds.length === 0) return [];

  const db = requireFirestoreDb();
  const batch = writeBatch(db);
  for (const folderId of folderIds) batch.delete(doc(db, "users", userId, "folders", folderId));
  await batch.commit();
  return folderIds;
};
const maybeReload = (reload: boolean): void => {
  if (reload && typeof window !== "undefined") window.location.reload();
};
const installLocalDbDevtools = (): void => {
  if (typeof window === "undefined" || !import.meta.env.DEV) return;

  const w = window as WindowWithLocalDbDevtools;

  w.clearDevModeCache = async (options?: string | ClearDevModeCacheOptions) => {
    const normalized = normalizeClearDevModeCacheOptions(options);
    const userId = normalized.userId || getAuthUid(w) || null;
    const removedLocalStorageKeys = removeDevelopmentLocalStorageKeys();
    const clearedSessionStorage = clearDevelopmentSessionStorage();
    const { deletedIndexedDbNames, failedIndexedDbNames } = await clearDevelopmentIndexedDbs(userId);
    const deletedCacheStorageKeys = await clearDevelopmentCacheStorage();

    maybeReload(normalized.reload);
    return { userId, deletedIndexedDbNames, failedIndexedDbNames, removedLocalStorageKeys, clearedSessionStorage, deletedCacheStorageKeys, reloaded: normalized.reload };
  };

  w.clearDevCache = w.clearDevModeCache;

  w.deleteDefaultNewFolders = async (options?: string | string[] | DeleteDefaultNewFoldersOptions) => {
    const normalized = normalizeDeleteDefaultNewFoldersOptions(options);
    const userId = normalized.userId || getAuthUid(w);
    if (!userId) throw new Error("deleteDefaultNewFolders: userId is required");

    const targetNames = getUniqueNames(normalized.names);
    if (targetNames.length === 0) return { userId, targetNames, matchedLocalFolderIds: [], deletedLocalFolderIds: [], skippedNonEmptyLocalFolderIds: [], matchedFirebaseFolderIds: [], deletedFirebaseFolderIds: [], skippedNonEmptyFirebaseFolderIds: [], onlyEmpty: normalized.onlyEmpty, dryRun: normalized.dryRun, reloaded: false };

    const db = getLocalDbSync() ?? await getLocalDb(userId);
    const localMatches = normalized.includeLocal ? await getLocalFolderMatches(db, targetNames, normalized.includeDeleted, normalized.onlyEmpty) : { matchedFolderIds: [], skippedNonEmptyFolderIds: [] };
    const localDeleted = normalized.dryRun ? [] : await deleteLocalFolders(db, localMatches.matchedFolderIds);
    const firebaseMatched: string[] = [];
    const firebaseSkippedNonEmpty: string[] = [];
    let firebaseDeleted: string[] = [];

    if (normalized.includeFirebase) {
      const firebaseFolders = await getFirebaseFolderRecords(userId);
      for (const folder of firebaseFolders) {
        const folderName = getFolderRecordName(folder.data);
        if (!folderName || !targetNames.includes(folderName)) continue;
        if (!normalized.includeDeleted && isFolderRecordDeleted(folder.data)) continue;
        if (normalized.onlyEmpty && !(await isFirebaseFolderEmpty(userId, folder.id))) {
          firebaseSkippedNonEmpty.push(folder.id);
          continue;
        }
        firebaseMatched.push(folder.id);
      }
      firebaseDeleted = normalized.dryRun ? [] : await deleteFirebaseFolders(userId, firebaseMatched);
    }

    maybeReload(normalized.reload && !normalized.dryRun);
    return { userId, targetNames, matchedLocalFolderIds: localMatches.matchedFolderIds, deletedLocalFolderIds: localDeleted, skippedNonEmptyLocalFolderIds: localMatches.skippedNonEmptyFolderIds, matchedFirebaseFolderIds: firebaseMatched, deletedFirebaseFolderIds: firebaseDeleted, skippedNonEmptyFirebaseFolderIds: firebaseSkippedNonEmpty, onlyEmpty: normalized.onlyEmpty, dryRun: normalized.dryRun, reloaded: normalized.reload && !normalized.dryRun };
  };

  w.deleteNewFolders = w.deleteDefaultNewFolders;

  w.dbDebug = async () => {
    const db = getLocalDbSync() ?? await getLocalDb(getAuthUid(w));
    console.log("[LocalDB]", db);
    console.table(await db.folders.toArray());
  };

  w.repairTags = async (userId?: string) => {
    const targetUserId = userId || getAuthUid(w);
    if (!targetUserId) throw new Error("repairTags: userId is required");
    assertRepairTagsAllowed(targetUserId);
    return auditAndRepairTags(targetUserId);
  };

  w.__dbHelpers = {
    addDebugFolder: async (data: unknown) => {
      const db = getLocalDbSync() ?? await getLocalDb(getAuthUid(w));
      const row = isRecord(data) ? data : { name: String(data ?? "debug") };
      await db.folders.add({ id: `debug-${Date.now()}`, userId: getAuthUid(w) ?? "debug", ...row } as never);
      return row;
    },
    dump: async () => {
      const db = getLocalDbSync() ?? await getLocalDb(getAuthUid(w));
      console.table(await db.folders.toArray());
    },
    rawDB: async () => getLocalDbSync() ?? await getLocalDb(getAuthUid(w)),
  };
};



export { installLocalDbDevtools };
