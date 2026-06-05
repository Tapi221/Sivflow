import { SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";
import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { LocalDB, getLocalDb, getLocalDbSync } from "./LocalDB";
import { LOCALDB_GENERATION_KEY_PREFIX, LOCALDB_GENERATION_MAX, LOCALDB_NAME_PREFIX, LOCALDB_SCHEMA_VERSION_FOR_NAME } from "./localdb.constants";
import { requireFirestoreDb } from "@/infrastructure/firebase/client";
import { auditAndRepairTags } from "@/services/localdb/audit/tags";
import { auth } from "@/services/firebase";

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

type ClearDevModeCache = (
  options?: string | ClearDevModeCacheOptions,
) => Promise<ClearDevModeCacheResult>;

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

type DeleteDefaultNewFolders = (
  options?: string | string[] | DeleteDefaultNewFoldersOptions,
) => Promise<DeleteDefaultNewFoldersResult>;

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

const REPAIR_TAGS_ALLOWLIST = (
  import.meta.env.VITE_REPAIR_TAGS_ALLOWLIST ??
  import.meta.env.VITE_REPAIR_TAGS_ALLOWED_UIDS ??
  ""
)
  .split(",")
  .map((uid) => uid.trim())
  .filter(Boolean);
const DEV_INDEXED_DB_DELETE_TIMEOUT_MS = 2000;
const DEV_FIRESTORE_BATCH_LIMIT = 450;
const DEFAULT_NEW_FOLDER_NAMES = ["新規フォルダ"] as const;
const DEV_LOCAL_STORAGE_PREFIXES = [
  LOCALDB_GENERATION_KEY_PREFIX,
  "flashcard-master:",
  "cardsetview.",
  "card-view.",
  "card-editor.",
  "folder_",
  "ui.",
  "workspace.",
  "app:",
] as const;
const DEV_LOCAL_STORAGE_EXTRA_KEYS = ["explorer-storage"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const getString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getBoolean = (value: unknown): boolean | undefined =>
  typeof value === "boolean" ? value : undefined;

const getNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

const toDateOrNow = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    // Invalid Date 回避
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
};

const getAuthUid = (w: WindowWithLocalDbDevtools): string | undefined => {
  const firebaseUid = auth.currentUser?.uid;
  if (typeof firebaseUid === "string" && firebaseUid.length > 0) {
    return firebaseUid;
  }

  const windowUid = w.auth?.currentUser?.uid;
  return typeof windowUid === "string" ? windowUid : undefined;
};

const assertRepairTagsAllowed = (userId: string): void => {
  if (REPAIR_TAGS_ALLOWLIST.length === 0) {
    throw new Error("repairTags: forbidden");
  }

  if (!REPAIR_TAGS_ALLOWLIST.includes(userId)) {
    throw new Error("repairTags: forbidden");
  }
};

const normalizeClearDevModeCacheOptions = (
  options?: string | ClearDevModeCacheOptions,
): Required<ClearDevModeCacheOptions> => {
  if (typeof options === "string") {
    return { userId: options, reload: true };
  }

  return {
    userId: options?.userId ?? "",
    reload: options?.reload ?? true,
  };
};

const normalizeDeleteDefaultNewFoldersOptions = (
  options?: string | string[] | DeleteDefaultNewFoldersOptions,
): Required<DeleteDefaultNewFoldersOptions> => {
  if (typeof options === "string") {
    return {
      userId: "",
      names: [options],
      includeLocal: true,
      includeFirebase: true,
      includeDeleted: false,
      onlyEmpty: true,
      dryRun: false,
      reload: true,
    };
  }

  if (Array.isArray(options)) {
    return {
      userId: "",
      names: options,
      includeLocal: true,
      includeFirebase: true,
      includeDeleted: false,
      onlyEmpty: true,
      dryRun: false,
      reload: true,
    };
  }

  return {
    userId: options?.userId ?? "",
    names: options?.names ?? [...DEFAULT_NEW_FOLDER_NAMES],
    includeLocal: options?.includeLocal ?? true,
    includeFirebase: options?.includeFirebase ?? true,
    includeDeleted: options?.includeDeleted ?? false,
    onlyEmpty: options?.onlyEmpty ?? true,
    dryRun: options?.dryRun ?? false,
    reload: options?.reload ?? true,
  };
};

const collectStorageKeys = (...sources: StorageKeySource[]): Set<string> => {
  const keys = new Set<string>(DEV_LOCAL_STORAGE_EXTRA_KEYS);

  for (const source of sources) {
    for (const value of Object.values(source)) {
      if (typeof value === "string") {
        keys.add(value);
        continue;
      }

      for (const key of value) {
        keys.add(key);
      }
    }
  }

  return keys;
};

const shouldRemoveLocalStorageKey = (
  key: string,
  exactKeys: ReadonlySet<string>,
): boolean => {
  if (exactKeys.has(key)) return true;
  return DEV_LOCAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix));
};

const removeDevelopmentLocalStorageKeys = (): string[] => {
  if (typeof window === "undefined") return [];

  const exactKeys = collectStorageKeys(SHARED_STORAGE_KEYS, WEB_STORAGE_KEYS);
  const removedKeys: string[] = [];
  const keys = Array.from({ length: window.localStorage.length }, (_, index) =>
    window.localStorage.key(index),
  ).filter((key): key is string => typeof key === "string");

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

  for (let generation = 0; generation <= LOCALDB_GENERATION_MAX; generation += 1) {
    names.push(
      `${LOCALDB_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`,
    );
  }

  names.push(`${LOCALDB_NAME_PREFIX}${userId}`);
  return names;
};

const listDevelopmentIndexedDbNames = async (
  userId: string | null,
): Promise<string[]> => {
  if (typeof indexedDB === "undefined") return [];

  const names = new Set<string>();
  const knownUserIds = new Set<string>(["anonymous"]);
  if (userId) knownUserIds.add(userId);

  for (const knownUserId of knownUserIds) {
    for (const name of getKnownLocalDbNamesForUser(knownUserId)) {
      names.add(name);
    }
  }

  if (typeof indexedDB.databases === "function") {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      const name = db?.name;
      if (!name?.startsWith(LOCALDB_NAME_PREFIX)) continue;
      names.add(name);
    }
  }

  return Array.from(names.values());
};

const deleteIndexedDatabase = async (name: string): Promise<boolean> => {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return false;
  }

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

const clearDevelopmentIndexedDbs = async (
  userId: string | null,
): Promise<Pick<ClearDevModeCacheResult, "deletedIndexedDbNames" | "failedIndexedDbNames">> => {
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

const getFolderTable = (db: unknown): LocalFolderTable =>
  (db as { folders: LocalFolderTable }).folders;

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

const getUniqueNames = (names: string[]): string[] => {
  return Array.from(
    new Set(
      names
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    ),
  );
};

const shouldDeleteFolderRecord = (
  folder: unknown,
  userId: string | null,
  targetNames: ReadonlySet<string>,
  includeDeleted: boolean,
): boolean => {
  if (!isRecord(folder)) return false;
  if (userId && folder.userId !== userId) return false;
  if (!includeDeleted && isFolderRecordDeleted(folder)) return false;

  const name = getFolderRecordName(folder);
  return name !== null && targetNames.has(name);
};

const hasActiveFolderChild = (folders: unknown[], folderId: string): boolean => {
  return folders.some((folder) => {
    if (isFolderRecordDeleted(folder)) return false;
    if (getFolderRecordId(folder) === folderId) return false;
    return getFolderRecordParentId(folder) === folderId;
  });
};

const hasActiveFolderEntity = (entities: unknown[], folderId: string): boolean => {
  return entities.some((entity) => {
    if (isFolderRecordDeleted(entity)) return false;
    return getEntityFolderId(entity) === folderId;
  });
};

const isEmptyFolder = (
  folderId: string,
  folders: unknown[],
  cardSets: unknown[],
  cards: unknown[],
  documents: unknown[],
): boolean => {
  return !hasActiveFolderChild(folders, folderId) &&
    !hasActiveFolderEntity(cardSets, folderId) &&
    !hasActiveFolderEntity(cards, folderId) &&
    !hasActiveFolderEntity(documents, folderId);
};

const filterEmptyFolderIds = (
  candidateIds: string[],
  folders: unknown[],
  cardSets: unknown[],
  cards: unknown[],
  documents: unknown[],
  onlyEmpty: boolean,
): FolderMatchResult => {
  const matchedFolderIds: string[] = [];
  const skippedNonEmptyFolderIds: string[] = [];

  for (const id of candidateIds) {
    if (!onlyEmpty || isEmptyFolder(id, folders, cardSets, cards, documents)) {
      matchedFolderIds.push(id);
      continue;
    }

    skippedNonEmptyFolderIds.push(id);
  }

  return { matchedFolderIds, skippedNonEmptyFolderIds };
};

const listLocalDefaultNewFolderIds = async (
  userId: string | null,
  names: string[],
  includeDeleted: boolean,
  onlyEmpty: boolean,
): Promise<FolderMatchResult> => {
  const db = await getLocalDb(userId ?? undefined);
  const folders = await getFolderTable(db).toArray();
  const [cardSets, cards, documents] = await Promise.all([
    getTableItems(db, "cardSets"),
    getTableItems(db, "cards"),
    getTableItems(db, "documents"),
  ]);
  const targetNames = new Set(names);
  const candidateIds = folders
    .filter((folder) => shouldDeleteFolderRecord(folder, userId, targetNames, includeDeleted))
    .map(getFolderRecordId)
    .filter((id): id is string => typeof id === "string");

  return filterEmptyFolderIds(
    Array.from(new Set(candidateIds)),
    folders,
    cardSets,
    cards,
    documents,
    onlyEmpty,
  );
};

const deleteLocalDefaultNewFolders = async (
  userId: string | null,
  ids: string[],
): Promise<string[]> => {
  if (ids.length === 0) return [];

  const db = await getLocalDb(userId ?? undefined);
  await getFolderTable(db).bulkDelete(ids);
  return ids;
};

const fetchFirebaseCollectionRecords = async (
  userId: string,
  collectionName: string,
): Promise<FirestoreRecord[]> => {
  const firestore = requireFirestoreDb();
  const snapshot = await getDocs(collection(firestore, `users/${userId}/${collectionName}`));

  return snapshot.docs.map((item) => ({
    id: item.id,
    data: item.data(),
  }));
};

const toFirestoreFolderRecords = (records: FirestoreRecord[]): Record<string, unknown>[] => {
  return records.map((record) => ({ id: record.id, ...record.data }));
};

const listSingleFirebaseUserId = async (): Promise<string | null> => {
  const firestore = requireFirestoreDb();
  const snapshot = await getDocs(collection(firestore, "users"));
  const ids = snapshot.docs.map((item) => item.id).filter((id) => id.trim().length > 0);
  return ids.length === 1 ? ids[0] : null;
};

const resolveDeleteDefaultNewFoldersUserId = async (
  w: WindowWithLocalDbDevtools,
  explicitUserId: string,
  includeFirebase: boolean,
): Promise<string | null> => {
  const userId = explicitUserId || getAuthUid(w);
  if (userId) return userId;
  if (!includeFirebase) return null;
  return await listSingleFirebaseUserId();
};

const listFirebaseDefaultNewFolderIds = async (
  userId: string,
  names: string[],
  includeDeleted: boolean,
  onlyEmpty: boolean,
): Promise<FolderMatchResult> => {
  const [folderRecords, cardSetRecords, cardRecords, documentRecords] = await Promise.all([
    fetchFirebaseCollectionRecords(userId, "folders"),
    fetchFirebaseCollectionRecords(userId, "cardSets"),
    fetchFirebaseCollectionRecords(userId, "cards"),
    fetchFirebaseCollectionRecords(userId, "documents"),
  ]);
  const folders = toFirestoreFolderRecords(folderRecords);
  const cardSets = toFirestoreFolderRecords(cardSetRecords);
  const cards = toFirestoreFolderRecords(cardRecords);
  const documents = toFirestoreFolderRecords(documentRecords);
  const targetNames = new Set(names);
  const candidateIds = folders
    .filter((folder) => shouldDeleteFolderRecord(folder, userId, targetNames, includeDeleted))
    .map(getFolderRecordId)
    .filter((id): id is string => typeof id === "string");

  return filterEmptyFolderIds(
    Array.from(new Set(candidateIds)),
    folders,
    cardSets,
    cards,
    documents,
    onlyEmpty,
  );
};

const deleteFirebaseDefaultNewFolders = async (
  userId: string,
  ids: string[],
): Promise<string[]> => {
  if (ids.length === 0) return [];

  const firestore = requireFirestoreDb();
  const deletedIds: string[] = [];

  for (let index = 0; index < ids.length; index += DEV_FIRESTORE_BATCH_LIMIT) {
    const batchIds = ids.slice(index, index + DEV_FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(firestore);

    for (const id of batchIds) {
      batch.delete(doc(firestore, `users/${userId}/folders`, id));
    }

    await batch.commit();
    deletedIds.push(...batchIds);
  }

  return deletedIds;
};

const clearDeletedFolderSelectionState = (deletedFolderIds: string[]): void => {
  if (typeof window === "undefined" || deletedFolderIds.length === 0) return;

  const deletedIds = new Set(deletedFolderIds);
  if (deletedIds.has(window.localStorage.getItem(WEB_STORAGE_KEYS.lastSelectedFolderId) ?? "")) {
    window.localStorage.removeItem(WEB_STORAGE_KEYS.lastSelectedFolderId);
  }
};

const clearDevModeCache = async (
  w: WindowWithLocalDbDevtools,
  options?: string | ClearDevModeCacheOptions,
): Promise<ClearDevModeCacheResult> => {
  if (!import.meta.env.DEV) {
    throw new Error("clearDevModeCache is only available in development mode.");
  }

  const normalizedOptions = normalizeClearDevModeCacheOptions(options);
  const userId = normalizedOptions.userId || getAuthUid(w) || null;
  const removedLocalStorageKeys = removeDevelopmentLocalStorageKeys();
  const clearedSessionStorage = clearDevelopmentSessionStorage();
  const { deletedIndexedDbNames, failedIndexedDbNames } =
    await clearDevelopmentIndexedDbs(userId);
  const deletedCacheStorageKeys = await clearDevelopmentCacheStorage();
  const result: ClearDevModeCacheResult = {
    userId,
    deletedIndexedDbNames,
    failedIndexedDbNames,
    removedLocalStorageKeys,
    clearedSessionStorage,
    deletedCacheStorageKeys,
    reloaded: normalizedOptions.reload,
  };

  console.log("[clearDevModeCache] done", result);

  if (normalizedOptions.reload) {
    window.setTimeout(() => window.location.reload(), 0);
  }

  return result;
};

const deleteDefaultNewFolders = async (
  w: WindowWithLocalDbDevtools,
  options?: string | string[] | DeleteDefaultNewFoldersOptions,
): Promise<DeleteDefaultNewFoldersResult> => {
  if (!import.meta.env.DEV) {
    throw new Error("deleteDefaultNewFolders is only available in development mode.");
  }

  const normalizedOptions = normalizeDeleteDefaultNewFoldersOptions(options);
  const targetNames = getUniqueNames(normalizedOptions.names);
  const userId = await resolveDeleteDefaultNewFoldersUserId(
    w,
    normalizedOptions.userId,
    normalizedOptions.includeFirebase,
  );

  if (targetNames.length === 0) {
    throw new Error("deleteDefaultNewFolders: at least one folder name is required.");
  }

  if (normalizedOptions.includeFirebase && !userId) {
    throw new Error("deleteDefaultNewFolders: userId is required or exactly one users document must exist when includeFirebase is true.");
  }

  const localMatch = normalizedOptions.includeLocal
    ? await listLocalDefaultNewFolderIds(userId, targetNames, normalizedOptions.includeDeleted, normalizedOptions.onlyEmpty)
    : { matchedFolderIds: [], skippedNonEmptyFolderIds: [] };
  const firebaseMatch = normalizedOptions.includeFirebase && userId
    ? await listFirebaseDefaultNewFolderIds(userId, targetNames, normalizedOptions.includeDeleted, normalizedOptions.onlyEmpty)
    : { matchedFolderIds: [], skippedNonEmptyFolderIds: [] };
  const deletedLocalFolderIds = normalizedOptions.dryRun
    ? []
    : await deleteLocalDefaultNewFolders(userId, localMatch.matchedFolderIds);
  const deletedFirebaseFolderIds = normalizedOptions.dryRun || !normalizedOptions.includeFirebase || !userId
    ? []
    : await deleteFirebaseDefaultNewFolders(userId, firebaseMatch.matchedFolderIds);
  const result: DeleteDefaultNewFoldersResult = {
    userId,
    targetNames,
    matchedLocalFolderIds: localMatch.matchedFolderIds,
    deletedLocalFolderIds,
    skippedNonEmptyLocalFolderIds: localMatch.skippedNonEmptyFolderIds,
    matchedFirebaseFolderIds: firebaseMatch.matchedFolderIds,
    deletedFirebaseFolderIds,
    skippedNonEmptyFirebaseFolderIds: firebaseMatch.skippedNonEmptyFolderIds,
    onlyEmpty: normalizedOptions.onlyEmpty,
    dryRun: normalizedOptions.dryRun,
    reloaded: normalizedOptions.reload && !normalizedOptions.dryRun,
  };

  if (!normalizedOptions.dryRun) {
    clearDeletedFolderSelectionState([...deletedLocalFolderIds, ...deletedFirebaseFolderIds]);
  }

  console.log("[deleteDefaultNewFolders] done", result);

  if (normalizedOptions.reload && !normalizedOptions.dryRun) {
    window.setTimeout(() => window.location.reload(), 0);
  }

  return result;
};

export const installLocalDbDevtools = () => {
  if (typeof window === "undefined") return;

  const w = window as WindowWithLocalDbDevtools;

  w.clearDevModeCache = (options) => clearDevModeCache(w, options);
  w.clearDevCache = w.clearDevModeCache;
  w.deleteDefaultNewFolders = (options) => deleteDefaultNewFolders(w, options);
  w.deleteNewFolders = w.deleteDefaultNewFolders;

  w.repairTags = async (userId?: string) => {
    const resolvedUserId = userId ?? getAuthUid(w);
    if (!resolvedUserId) {
      throw new Error("repairTags: userId is required");
    }

    assertRepairTagsAllowed(resolvedUserId);

    const result = await auditAndRepairTags(resolvedUserId);
    console.log("[repairTags] result", result);
    return result;
  };

  // Allow overwriting to prevent "Cannot set property... which has only a getter" errors
  try {
    Object.defineProperty(w, "dbInstance", {
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
    console.warn("[LocalDB] Failed to define window.dbInstance", e);
  }

  // DevTools helper: call `dbDebug()` in Console to dump LocalDB and syncQueue
  w.dbDebug = async () => {
    console.group("--- LocalDB / syncQueue Debug ---");
    try {
      const db = await getLocalDb();

      console.log(
        "DB name:",
        (db as { name?: unknown } | null | undefined)?.name,
      );

      console.log("Folders:");
      try {
        const folders = await (
          db as unknown as { getAllFolders: () => Promise<unknown[]> }
        ).getAllFolders();
        console.table(folders);
      } catch (e) {
        console.warn("Failed to read folders", e);
      }

      console.log("Cards:");
      try {
        const cards = await (
          db as unknown as { getAllCards: () => Promise<unknown[]> }
        ).getAllCards();
        console.table(cards);
      } catch (e) {
        console.warn("Failed to read cards", e);
      }

      console.log("SyncQueue:");
      try {
        const rows = await (
          db as unknown as { syncQueue: { toArray: () => Promise<unknown[]> } }
        ).syncQueue.toArray();

        console.log("syncQueue rows length:", rows.length);
        console.table(rows);
      } catch (e) {
        console.warn("Failed to read syncQueue", e);
      }
    } catch (err) {
      console.error("dbDebug error", err);
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
        const userId = getString(input.userId) ?? getAuthUid(w) ?? "debug-user";
        const folderName =
          getString(input.folderName) ?? getString(input.name) ?? "DEBUG";

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

        console.log("[__dbHelpers] addDebugFolder -> payload", payload);

        const newId = await (
          db as unknown as {
            addItem: (table: string, item: unknown) => Promise<unknown>;
          }
        ).addItem("folders", payload);

        console.log("[__dbHelpers] addDebugFolder SUCCESS id=", newId);
        return newId;
      } catch (e) {
        console.error("[__dbHelpers] addDebugFolder ERROR", e);
        throw e;
      }
    },

    dump: async () => {
      await w.dbDebug?.();
    },

    rawDB: async () => getLocalDb(),
  };
};