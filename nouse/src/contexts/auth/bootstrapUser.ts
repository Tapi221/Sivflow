import { AppInitializer } from "@/services/AppInitializer";
import { getLocalDb, initializeDB } from "@/services/localdb";



type CleanupCapableLocalDb = Awaited<ReturnType<typeof getLocalDb>> & {
  cleanupSyncHistory?: () => Promise<void>;
  cleanupSyncErrors?: () => Promise<void>;
};



const bootstrapUser = async (userId: string) => {
  await initializeDB(userId);

  const initResult = await AppInitializer.initialize(userId);
  if (initResult?.degraded) {
    console.warn("[Auth] startup_degraded=true", {
      userId,
      reason: initResult.reason,
      skippedFailures: initResult.skippedFailures ?? 0,
    });
  }

  const db = await getLocalDb();
  const cleanupDb = db as CleanupCapableLocalDb;
  await cleanupDb.cleanupSyncHistory?.();
  await cleanupDb.cleanupSyncErrors?.();
};



export { bootstrapUser };
