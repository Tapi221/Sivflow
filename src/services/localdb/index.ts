// Public API entry point for localdb module

export type {
  CardRelation,
  ProjectMap,
  TagLegacyRecord,
  TagV2Record,
  LocalDBLike,
  LocalDBInstance,
} from './LocalDB';

export { LocalDB, getLocalDb, getLocalDbSync, resetLocalDBForLogout, initializeDB } from './LocalDB';

export { isBackingStoreOpenError } from './errors';

export { LOCALDB_RECOVERY_GUIDE_URL } from './constants';

export {
  clearLocalDBResetFailureReason,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
} from '../localDBRuntimeState';
