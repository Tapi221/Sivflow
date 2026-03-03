// Public API entry point for localdb module

export type { CardRelation, ProjectMap, TagLegacyRecord, TagV2Record } from './types';
export type { LocalDBLike, LocalDBInstance } from './types';

export { LocalDB } from './LocalDB';
export { getLocalDb, getLocalDbSync, resetLocalDBForLogout, initializeDB } from './instanceManager';

export { isBackingStoreOpenError } from './errors';

export { LOCALDB_RECOVERY_GUIDE_URL } from './constants';

export {
  clearLocalDBResetFailureReason,
  getLocalDBTelemetrySnapshot,
  getLocalDBRuntimeStatus,
  subscribeLocalDBRuntimeStatus,
  telemetryOncePerSession,
} from '../localDBRuntimeState';

// devtools の副作用起動（開発環境のみ）
if (import.meta.env.DEV) {
  import('./devtools').then(m => m.installLocalDbDevtools());
}
