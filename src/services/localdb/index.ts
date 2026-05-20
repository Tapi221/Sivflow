// Public API entry point for localdb module

export { isBackingStoreOpenError } from "./errors";
export {
  getLocalDb,
  getLocalDbSync,
  initializeDB,
  resetLocalDBForLogout,
} from "./instanceManager";
export { LocalDB } from "./LocalDB";
export type {
  CardRelation,
  LocalDBInstance,
  LocalDBLike,
  ProjectMap,
} from "./types";
export {
  clearLocalDBResetFailureReason,
  getLocalDBRuntimeStatus,
  getLocalDBTelemetrySnapshot,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
} from "@/services/localDBRuntimeState";
export { LOCALDB_RECOVERY_GUIDE_URL } from "@constants/shared/storage";

if (import.meta.env.DEV) {
  void import("./devtools").then((module) => {
    module.installLocalDbDevtools();
  });
}
