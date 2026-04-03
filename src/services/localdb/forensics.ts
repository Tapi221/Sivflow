import { warnOncePerSession } from "@/services/localDBRuntimeState";
import { isBackingStoreOpenError } from "./errors";

export const listDatabases = () => {
  if (!indexedDB.databases) return [];
  try {
    const dbs = await indexedDB.databases();
    return dbs;
  } catch (error) {
    if (isBackingStoreOpenError(error)) {
      warnOncePerSession(
        "localdb:list-databases-backing-store",
        `[LocalDB] Failed to list IndexedDB databases due to backing store error. Recovery guide: https://support.google.com/chrome/answer/2392709`,
        error,
      );
    }
    return [];
  }
};

type ForensicDbDetail = { name: string; tables: number; records: number };
type ForensicSummary = {
  databasesScanned: number;
  totalRecordsFound: number;
  dbDetails: ForensicDbDetail[];
};

export const fullOriginForensicAudit = (onProgress?: (msg: string) => void) => {
  console.log("[Forensic-Audit] Starting origin-wide scan...");
  onProgress?.("全オリジン調査を開始...");

  const dbInfos = await listDatabases();
  const summary: ForensicSummary = {
    databasesScanned: 0,
    totalRecordsFound: 0,
    dbDetails: [],
  };

  for (const info of dbInfos) {
    if (!info.name) continue;
    summary.databasesScanned++;
    console.log(`[Forensic-DB:${info.name}] Investigating...`);
    onProgress?.(`調査中: ${info.name}`);

    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(info.name!);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      const storeNames = Array.from(db.objectStoreNames);
      const dbSummary = {
        name: info.name,
        tables: storeNames.length,
        records: 0,
      };

      for (const storeName of storeNames) {
        try {
          const transaction = db.transaction(storeName, "readonly");
          const store = transaction.objectStore(storeName);

          await new Promise((resolve, reject) => {
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = (e: Event) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>)
                .result;
              if (cursor) {
                const record = cursor.value;
                try {
                  console.log(
                    `[Forensic-REC] DB:${info.name} TABLE:${storeName} KEY:${JSON.stringify(cursor.key).substring(0, 100)}`,
                    record,
                  );
                } catch {
                  console.log(
                    `[Forensic-REC] DB:${info.name} TABLE:${storeName} (Un-stringifiable key)`,
                    record,
                  );
                }
                dbSummary.records++;
                summary.totalRecordsFound++;
                cursor.continue();
              } else {
                resolve(null);
              }
            };
            cursorReq.onerror = () => reject(cursorReq.error);
          });
        } catch (e) {
          console.error(
            `[Forensic-ERROR] Failed to read table ${storeName} in ${info.name}`,
            e,
          );
        }
      }
      db.close();
      summary.dbDetails.push(dbSummary);
    } catch (e) {
      console.error(`[Forensic-ERROR] Failed to open DB ${info.name}`, e);
    }
  }

  console.log("[Forensic-Audit] Completed.", summary);
  onProgress?.(
    `調査完了: ${summary.totalRecordsFound} 件のレコード断片をコンソールに出力しました`,
  );
  return summary;
};
