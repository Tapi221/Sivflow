// Public API entry point for localdb module

if (import.meta.env.DEV) {
  void import("./devtools").then((module) => {
    module.installLocalDbDevtools();
  });
}



export { isBackingStoreOpenError } from "./errors";
export { getLocalDb, getLocalDbSync, initializeDB, resetLocalDBForLogout } from "./instanceManager";
export { LocalDB } from "./LocalDB";
export { LOCALDB_RECOVERY_GUIDE_URL } from "./localdb.constants";
export { clearLocalDBResetFailureReason, getLocalDBRuntimeStatus, getLocalDBTelemetrySnapshot, subscribeLocalDBRuntimeStatus, telemetryOncePerSession } from "@/services/localDBRuntimeState";


export type { CardRelation, LocalDBInstance, LocalDBLike, ProjectMap } from "./types";
