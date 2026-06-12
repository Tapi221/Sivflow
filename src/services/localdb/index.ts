// Public API entry point for localdb module

if (import.meta.env.DEV) {
  void import("@/services/localdb/devtools").then((module) => {
    module.installLocalDbDevtools();
  });
}

export { isBackingStoreOpenError } from "@/services/localdb/errors";
export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout } from "@/services/localdb/instanceManager";
export { LocalDB } from "@/services/localdb/LocalDB";
export { LOCALDB_RECOVERY_GUIDE_URL } from "@/services/localdb/localdb.constants";
export { clearLocalDBResetFailureReason, getLocalDBRuntimeStatus, getLocalDBTelemetrySnapshot, subscribeLocalDBRuntimeStatus, telemetryOncePerSession } from "@/services/localDBRuntimeState";
export type { CardRelation, LocalDBInstance, LocalDBLike, ProjectMap } from "@/services/localdb/types";
