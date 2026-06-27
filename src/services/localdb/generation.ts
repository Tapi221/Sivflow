import { Dexie } from "dexie";
import { safeStringifyError } from "./errors";
import { LOCALDB_GENERATION_KEY_PREFIX, LOCALDB_GENERATION_MAX, LOCALDB_LEGACY_GENERATION_KEY_PREFIX, LOCALDB_LEGACY_NAME_PREFIX, LOCALDB_NAME_PREFIX, LOCALDB_SCHEMA_VERSION_FOR_NAME } from "./localdb.constants";
import { warnOncePerSession } from "@/services/localDBRuntimeState";



const generationBumpedUsers = new Set<string>();



const getLocalDbGenerationStorageKey = (userId: string): string => `${LOCALDB_GENERATION_KEY_PREFIX}${userId}`;
const getLegacyLocalDbGenerationStorageKey = (userId: string): string => `${LOCALDB_LEGACY_GENERATION_KEY_PREFIX}${userId}`;
const makeGenerationDbPrefix = (prefix: string, userId: string): string => `${prefix}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g`;
const readGenerationFromStorage = (userId: string): number => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(getLocalDbGenerationStorageKey(userId)) ?? window.localStorage.getItem(getLegacyLocalDbGenerationStorageKey(userId));
    const parsed = Number(raw ?? "0");
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(Math.floor(parsed), LOCALDB_GENERATION_MAX);
  } catch {
    return 0;
  }
};
const writeGenerationToStorage = (userId: string, generation: number): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getLocalDbGenerationStorageKey(userId), String(Math.min(Math.max(0, Math.floor(generation)), LOCALDB_GENERATION_MAX)));
    window.localStorage.removeItem(getLegacyLocalDbGenerationStorageKey(userId));
  } catch {
    // localStorage への書き込み失敗は無視します。
  }
};
const getGenerationForUser = (userId: string) => {
  return readGenerationFromStorage(userId);
};
const isLocalDbGenerationStorageKey = (key: string): boolean => key.startsWith(LOCALDB_GENERATION_KEY_PREFIX) || key.startsWith(LOCALDB_LEGACY_GENERATION_KEY_PREFIX);
const isLocalDbPersistentDatabaseName = (name: string): boolean => name.startsWith(LOCALDB_NAME_PREFIX) || name.startsWith(LOCALDB_LEGACY_NAME_PREFIX);
const getKnownLocalDbNamesForUser = (userId: string): string[] => {
  const names: string[] = [];
  const generationPrefix = makeGenerationDbPrefix(LOCALDB_NAME_PREFIX, userId);
  const legacyGenerationPrefix = makeGenerationDbPrefix(LOCALDB_LEGACY_NAME_PREFIX, userId);

  for (let generation = 0; generation <= LOCALDB_GENERATION_MAX; generation += 1) {
    names.push(`${generationPrefix}${generation}`);
    names.push(`${legacyGenerationPrefix}${generation}`);
  }

  names.push(`${LOCALDB_NAME_PREFIX}${userId}`);
  names.push(`${LOCALDB_LEGACY_NAME_PREFIX}${userId}`);
  return names;
};
const listUserPersistentDbNames = async (userId: string) => {
  const names = new Set<string>(getKnownLocalDbNamesForUser(userId));
  const generationPrefix = makeGenerationDbPrefix(LOCALDB_NAME_PREFIX, userId);
  const legacyGenerationPrefix = makeGenerationDbPrefix(LOCALDB_LEGACY_NAME_PREFIX, userId);

  if (typeof indexedDB !== "undefined" && typeof indexedDB.databases === "function") {
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        const name = db?.name;
        if (!name) continue;
        if (name.startsWith(generationPrefix) || name.startsWith(legacyGenerationPrefix)) {
          names.add(name);
        }
      }
    } catch (error) {
      warnOncePerSession(
        "localdb:list-user-db-names-failed",
        `[LocalDB] reset 中に user=${userId} の DB 名列挙に失敗しました。既知の generation を使って続行します。`,
        error,
      );
    }
  }

  return Array.from(names.values());
};
const bumpGenerationForUser = (userId: string) => {
  if (generationBumpedUsers.has(userId)) {
    return getGenerationForUser(userId);
  }
  generationBumpedUsers.add(userId);
  const current = getGenerationForUser(userId);
  const next = Math.min(current + 1, LOCALDB_GENERATION_MAX);
  if (next !== current) {
    writeGenerationToStorage(userId, next);
  }
  return next;
};
const getDatabaseNameForUser = (userId: string = "anonymous") => {
  const generation = getGenerationForUser(userId);
  return `${LOCALDB_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`;
};
const getFallbackDatabaseNameForUser = (userId: string) => {
  return `${LOCALDB_NAME_PREFIX}mem_${userId}`;
};
const deleteUserPersistentDatabases = async (userId: string) => {
  const names = await listUserPersistentDbNames(userId);
  let failureReason: string | null = null;

  for (const name of names) {
    try {
      await Dexie.delete(name);
    } catch (error) {
      if (!failureReason) {
        failureReason = `delete failed (${name}): ${safeStringifyError(error)}`;
      }
    }
  }

  return failureReason;
};



export { isLocalDbGenerationStorageKey, isLocalDbPersistentDatabaseName, getKnownLocalDbNamesForUser, bumpGenerationForUser, getDatabaseNameForUser, getFallbackDatabaseNameForUser, deleteUserPersistentDatabases };
