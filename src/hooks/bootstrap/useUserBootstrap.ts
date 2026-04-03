import { AppInitializer } from "@/services/AppInitializer";
import { getLocalDb, initializeDB } from "@/services/localDB";

export const bootstrapUser = (userId: string) => {
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
  await db.cleanupSyncHistory();
  await db.cleanupSyncErrors();

  console.log("[Auth] Running data integrity repair...");
  await db.repairDataIntegrity(userId);
};
