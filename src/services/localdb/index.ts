// Public API entry point for localdb module

export type {
  CardRelation,
  ProjectMap,
  TagLegacyRecord,
  TagV2Record,
} from "./types";
export type { LocalDBLike, LocalDBInstance } from "./types";

export { LocalDB } from "./LocalDB";
export {
  getLocalDb,
  getLocalDbSync,
  resetLocalDBForLogout,
  initializeDB,
} from "./instanceManager";

export { isBackingStoreOpenError } from "./errors";

export { LOCALDB_RECOVERY_GUIDE_URL } from "./constants";

export {
  clearLocalDBResetFailureReason,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
} from "../localDBRuntimeState";

// 本番でも読み込む。実際の機能露出は devtools 側の UID allowlist で制限する。
import("./devtools").then((m) => m.installLocalDbDevtools());
