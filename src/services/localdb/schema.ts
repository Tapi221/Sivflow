import type { LocalDB } from "./LocalDB";
import { LOCAL_DB_STORES } from "./schemaStores";

export const defineSchema = (db: LocalDB): void => {
  db.version(34).stores(LOCAL_DB_STORES);
};