import { IndexedDBMetadataService } from "./IndexedDBMetadataService";
import { IndexedDBRebuildOrchestrator } from "./IndexedDBRebuildOrchestrator";
import { getLocalDb } from "@/services/localdb";



type ResettableLocalDb = {
  delete: () => Promise<void>;
};



const rebuildIndexedDb = async (userId: string, reason?: string): Promise<{ degraded: boolean;
  failures: Array<{ type: string; id: string; error: string; }>;
}> => {
  console.log(`[AppInit:${userId}] IndexedDB を再構築しています...`);

  const db = await getLocalDb(userId);
  let metaService = new IndexedDBMetadataService(db, userId);

  await metaService.incrementRebuildCount(reason ?? "unknown");
  await (db as ResettableLocalDb).delete();
  await getLocalDb(userId);

  let rebuildResult: Awaited<
    ReturnType<typeof IndexedDBRebuildOrchestrator.rebuild>
  >;
  try {
    rebuildResult = await IndexedDBRebuildOrchestrator.rebuild(userId, reason);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[AppInit:${userId}] Rebuild FAILED: ${errorMessage}`, error);
    throw error;
  }

  const newDb = await getLocalDb(userId);
  metaService = new IndexedDBMetadataService(newDb, userId);
  await metaService.recomputeMetadataFor("post_rebuild");
  await metaService.markClean();
  if (rebuildResult.degraded) {
    console.warn(
      `[AppInit:${userId}] Rebuild completed with partial failures`,
      {
        count: rebuildResult.failures.length,
        failures: rebuildResult.failures.slice(0, 20),
      },
    );
  }
  return {
    degraded: rebuildResult.degraded,
    failures: rebuildResult.failures,
  };
};



export { rebuildIndexedDb };
