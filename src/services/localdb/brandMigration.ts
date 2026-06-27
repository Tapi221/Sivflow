import { Dexie } from "dexie";
import { LOCALDB_BRAND_MIGRATION_KEY_PREFIX, LOCALDB_GENERATION_MAX, LOCALDB_LEGACY_NAME_PREFIX, LOCALDB_NAME_PREFIX, LOCALDB_SCHEMA_VERSION_FOR_NAME } from "./localdb.constants";
import { defineNoteSchema } from "./noteSchema";
import { defineSchema } from "./schema";
import { warnOncePerSession } from "@/services/localDBRuntimeState";



type MigratableDexie = Dexie & Record<MigratableTableName, Dexie.Table<unknown, unknown>>;



const MIGRATABLE_TABLE_NAMES = ["folders", "cardSets", "cards", "documents", "notes", "users", "userSettings", "userStats", "syncMetadata", "levelHistories", "deviceMeta", "syncErrors", "syncHistory", "syncSettings", "syncQueue", "conflicts", "metadata", "images", "cardRelations", "projectMaps", "studyLogs", "tagRecords", "documentFiles"] as const;



type MigratableTableName = (typeof MIGRATABLE_TABLE_NAMES)[number];



const createMigrationDb = (name: string): MigratableDexie => {
  const db = new Dexie(name) as MigratableDexie;
  defineSchema(db as never);
  defineNoteSchema(db as never);
  return db;
};
const getMigrationStorageKey = (userId: string): string => `${LOCALDB_BRAND_MIGRATION_KEY_PREFIX}${userId}`;
const getGenerationDbName = (prefix: string, userId: string, generation: number): string => `${prefix}${userId}_v${LOCALDB_SCHEMA_VERSION_FOR_NAME}_g${generation}`;
const getLegacyDatabaseCandidates = (userId: string): string[] => {
  const names: string[] = [];

  for (let generation = 0; generation <= LOCALDB_GENERATION_MAX; generation += 1) {
    names.push(getGenerationDbName(LOCALDB_LEGACY_NAME_PREFIX, userId, generation));
  }

  names.push(`${LOCALDB_LEGACY_NAME_PREFIX}${userId}`);
  return names;
};
const hasCompletedBrandMigration = (userId: string): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(getMigrationStorageKey(userId)) === "done";
  } catch {
    return false;
  }
};
const markBrandMigrationComplete = (userId: string): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getMigrationStorageKey(userId), "done");
  } catch {
    // localStorage への書き込み失敗は無視します。
  }
};
const databaseExists = async (name: string): Promise<boolean> => {
  if (typeof indexedDB === "undefined") return false;

  if (typeof indexedDB.databases === "function") {
    const databases = await indexedDB.databases();
    return databases.some((database) => database.name === name);
  }

  const db = new Dexie(name);
  try {
    await db.open();
    return db.tables.length > 0;
  } catch {
    return false;
  } finally {
    db.close();
  }
};
const getFirstExistingDatabaseName = async (names: readonly string[]): Promise<string | null> => {
  for (const name of names) {
    if (await databaseExists(name)) return name;
  }

  return null;
};
const isDestinationEmpty = async (db: MigratableDexie): Promise<boolean> => {
  for (const tableName of MIGRATABLE_TABLE_NAMES) {
    if (!db.tables.some((table) => table.name === tableName)) continue;
    if (await db.table(tableName).count() > 0) return false;
  }

  return true;
};
const copyTable = async (source: MigratableDexie, destination: MigratableDexie, tableName: MigratableTableName): Promise<void> => {
  if (!source.tables.some((table) => table.name === tableName)) return;
  if (!destination.tables.some((table) => table.name === tableName)) return;

  const rows = await source.table(tableName).toArray();
  if (rows.length === 0) return;
  await destination.table(tableName).bulkPut(rows);
};
const migrateLegacyLocalDbBrandIfNeeded = async (userId: string, destinationDatabaseName: string): Promise<void> => {
  if (hasCompletedBrandMigration(userId)) return;
  if (!destinationDatabaseName.startsWith(LOCALDB_NAME_PREFIX)) return;

  const sourceDatabaseName = await getFirstExistingDatabaseName(getLegacyDatabaseCandidates(userId));
  if (!sourceDatabaseName) {
    markBrandMigrationComplete(userId);
    return;
  }

  const source = createMigrationDb(sourceDatabaseName);
  const destination = createMigrationDb(destinationDatabaseName);

  try {
    await source.open();
    await destination.open();

    if (!(await isDestinationEmpty(destination))) {
      markBrandMigrationComplete(userId);
      return;
    }

    await destination.transaction("rw", destination.tables, async () => {
      for (const tableName of MIGRATABLE_TABLE_NAMES) {
        await copyTable(source, destination, tableName);
      }
    });

    markBrandMigrationComplete(userId);
  } catch (error) {
    warnOncePerSession(
      "localdb:brand-migration-failed",
      `[LocalDB] user=${userId} の旧ブランド local database 移行に失敗しました。旧 database は変更せずに残します。`,
      error,
    );
  } finally {
    source.close();
    destination.close();
  }
};



export { migrateLegacyLocalDbBrandIfNeeded };
