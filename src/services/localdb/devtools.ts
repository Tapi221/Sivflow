import { LOCALDB_GENERATION_KEY_PREFIX, LOCALDB_GENERATION_MAX, LOCALDB_NAME_PREFIX, LOCALDB_SCHEMA_VERSION_FOR_NAME, SHARED_STORAGE_KEYS } from "@constants/shared/storage";
import { WEB_STORAGE_KEYS } from "@constants/web/storage";
import { collection, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { LocalDB, getLocalDb, getLocalDbSync } from "./LocalDB";
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
  dryRun?: boolean;
  reload?: boolean;
};

type DeleteDefaultNewFoldersResult = {
  userId: string | null;
  targetNames: string[];
  matchedLocalFolderIds: string[];
  deletedLocalFolderIds: string[];
  matchedFirebaseFolderIds: string[];
  deletedFirebaseFolderIds: string[];
  dryRun: boolean;
  reloaded: boolean;
};

type DeleteDefaultNewFolders = (
  options?: string | string[] | DeleteDefaultNewFoldersOptions,
) => Promise<DeleteDefaultNewFoldersResult>;

type StorageKeySource = Record<string, string | readonly string[]>;

type LocalFolderTable = {
  toArray: () => Promise<unknown[]>;
  bulkDelete: (keys: string[]) => Promise<void>;
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
const FIRESTORE_FOLDER_NAME_FIELDS = ["folderName", "folder_name", "name"] as const;
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

const getFolderTable = (db: unknown): LocalFolderTable =>
  (db as { folders: LocalFolderTable }).folders;

const getFolderRecordId = (folder: unknown): string | null => {
  if (!isRecord(folder)) return null;
  const id = getString(folder.id) ?? getString(folder.folderId);
  return id && id.trim().length > 0 ? id : null;
};

const getFolderRecordName = (folder: unknown): string | null => {
  if (!isRecord(folder)) return null;
  return getString(folder.folderName) ?? getString(folder.folder_name) ?? getString(folder.name) ?? null;
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

const listLocalDefaultNewFolderIds = async (
  userId: string | null,
  names: string[],
  includeDeleted: boolean,
): Promise<string[]> => {
  const db = await getLocalDb(userId ?? undefined);
  const folderTable = getFolderTable(db);
  const folders = await folderTable.toArray();
  const targetNames = new Set(names);
  const ids = folders
    .filter((folder) => shouldDeleteFolderRecord(folder, userId, targetNames, includeDeleted))
    .map(getFolderRecordId)
    .filter((id): id is string => typeof id === "string");

  return Array.from(new Set(ids));
};

const deleteLocalDefaultNewFolders = async (ids: string[]): Promise<string[]> => {
  if (ids.length === 0) return [];

  const db = await getLocalDb();
  await getFolderTable(db).bulkDelete(ids);
  return ids;
};

const listFirebaseDefaultNewFolderIds = async (
  userId: string,
  names: string[],
  includeDeleted: boolean,
): Promise<string[]> => {
  const firestore = requireFirestoreDb();
  const ids = new Set<string>();

  for (const name of names) {
    for (const field of FIRESTORE_FOLDER_NAME_FIELDS) {
      const snapshot = await getDocs(
        query(collection(firestore, `users/${userId}/folders`), where(field, "==", name)),
      );

      for (const folderDoc of snapshot.docs) {
        if (!includeDeleted) {
          const data = folderDoc.data();
          if (data.isDeleted === true || data.is_deleted === true) continue;
        }

        ids.add(folderDoc.id);
      }
    }
  }

  return Array.from(ids.values());
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
  const userId = normalizedOptions.userId || getAuthUid(w) || null;

  if (targetNames.length === 0) {
    throw new Error("deleteDefaultNewFolders: at least one folder name is required.");
  }

  if (normalizedOptions.includeFirebase && !userId) {
    throw new Error("deleteDefaultNewFolders: userId is required when includeFirebase is true.");
  }

  const matchedLocalFolderIds = normalizedOptions.includeLocal
    ? await listLocalDefaultNewFolderIds(userId, targetNames, normalizedOptions.includeDeleted)
    : [];
  const matchedFirebaseFolderIds = normalizedOptions.includeFirebase && userId
    ? await listFirebaseDefaultNewFolderIds(userId, targetNames, normalizedOptions.includeDeleted)
    : [];
  const firebaseTargetIds = Array.from(new Set([...matchedLocalFolderIds, ...matchedFirebaseFolderIds]));
  const deletedLocalFolderIds = normalizedOptions.dryRun
    ? []
    : await deleteLocalDefaultNewFolders(matchedLocalFolderIds);
  const deletedFirebaseFolderIds = normalizedOptions.dryRun || !normalizedOptions.includeFirebase || !userId
    ? []
    : await deleteFirebaseDefaultNewFolders(userId, firebaseTargetIds);
  const result: DeleteDefaultNewFoldersResult = {
    userId,
    targetNames,
    matchedLocalFolderIds,
    deletedLocalFolderIds,
    matchedFirebaseFolderIds,
    deletedFirebaseFolderIds,
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
