// Public API entry point for localdb module

export type {
  CardRelation,
  LocalDBInstance,
  LocalDBLike,
  ProjectMap,
} from "./types";

export {
  getLocalDb,
  getLocalDbSync,
  initializeDB,
  resetLocalDBForLogout,
} from "./instanceManager";
export { LocalDB } from "./LocalDB";

export { isBackingStoreOpenError } from "./errors";

export { LOCALDB_RECOVERY_GUIDE_URL } from "@constants/shared/localdb";

export {
  clearLocalDBResetFailureReason,
  getLocalDBRuntimeStatus,
  getLocalDBTelemetrySnapshot,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
} from "@/services/localDBRuntimeState";

// 本番でも読み込む。実際の機能露出は devtools 側の UID allowlist で制限する。
import("./devtools").then((m) => m.installLocalDbDevtools());
