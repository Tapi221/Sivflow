import { warnOncePerSession } from "@/services/localDBRuntimeState";
import { Dexie } from "dexie";
import {
  LOCALDB_GENERATION_KEY_PREFIX,
  LOCALDB_GENERATION_MAX,
  LOCALDB_NAME_PREFIX,
  LOCALDB_SCHEMA_VERSION_FOR_NAME,
} from "./constants";
import { safeStringifyError } from "./errors";

const readGenerationFromStorage = (userId: string): number => {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(
      `${LOCALDB_GENERATION_KEY_PREFIX}${userId}`,
    );
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
    window.localStorage.setItem(
      `${LOCALDB_GENERATION_KEY_PREFIX}${userId}`,
      String(
        Math.min(Math.max(0, Math.floor(generation)), LOCALDB_GENERATION_MAX),
      ),
    );
  } catch {
    // ignore localStorage write failures
  }
};

const makeGenerationDbPrefix = (userId: string): string =>
  `${LOCALDB_NAME_PREFIX}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g`;

// Module-level set replacing LocalDB.generationBumpedUsers
const generationBumpedUsers = new Set<string>();

const getGenerationForUser = (userId: string) => {
  return readGenerationFromStorage(userId);
};

export const bumpGenerationForUser = (userId: string) => {
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

export const getDatabaseNameForUser = (userId: string = "anonymous") => {
  const generation = getGenerationForUser(userId);
  return `FlashcardMasterDB_${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`;
};

export const getFallbackDatabaseNameForUser = (userId: string) => {
  return `FlashcardMasterDB_mem_${userId}`;
};

const listUserPersistentDbNames = (userId: string) => {
  const names = new Set<string>();
  const generationPrefix = makeGenerationDbPrefix(userId);

  for (
    let generation = 0;
    generation <= LOCALDB_GENERATION_MAX;
    generation += 1
  ) {
    names.add(`${generationPrefix}${generation}`);
  }

  names.add(`${LOCALDB_NAME_PREFIX}${userId}`);

  if (
    typeof indexedDB !== "undefined" &&
    typeof indexedDB.databases === "function"
  ) {
    try {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        const name = db?.name;
        if (!name) continue;
        if (name.startsWith(generationPrefix)) {
          names.add(name);
        }
      }
    } catch (error) {
      warnOncePerSession(
        "localdb:list-user-db-names-failed",
        `[LocalDB] Failed to enumerate user DB names during reset. Continuing with known generations for user=${userId}.`,
        error,
      );
    }
  }

  return Array.from(names.values());
};

export const deleteUserPersistentDatabases = (userId: string) => {
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
