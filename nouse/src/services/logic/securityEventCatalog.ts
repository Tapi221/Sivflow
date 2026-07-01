import type { SecurityEventType } from "@/types/domain/telemetry";



type SecurityEventCatalogEntry = {
  severity: "info" | "warning" | "critical";
  isUserVisible: boolean;
  description: string;
};



const SECURITY_EVENT_CATALOG: Record<SecurityEventType, SecurityEventCatalogEntry> = { LOGIN_SUCCESS: { severity: "info", isUserVisible: true, description: "ログインに成功しました" }, LOGIN_FAILED: { severity: "info", isUserVisible: false, description: "ログインに失敗しました" }, DEVICE_REVOKED: { severity: "warning", isUserVisible: true, description: "デバイス登録が解除されました" }, ACCESS_DENIED_REVOKED: { severity: "critical", isUserVisible: false, description: "無効化されたデバイスからのアクセスを拒否しました" }, SYNC_AUTH_ERROR: { severity: "warning", isUserVisible: false, description: "同期の認証エラーが発生しました" }, SENSITIVE_OP_REVOKED: { severity: "warning", isUserVisible: false, description: "権限のない重要な操作が拒否されました" }, DEVICE_NEW_REGISTER: { severity: "info", isUserVisible: true, description: "新しいデバイスが登録されました" }, LOCK_CONTENTION_EXCESS: { severity: "critical", isUserVisible: false, description: "同期ロックの頻繁な競合（奪取ループ）を検知しました" }, SYNC_CONFLICT_EXCESS: { severity: "warning", isUserVisible: false, description: "データ競合が異常に多発しています" }, ADMIN_DEVICE_REVOKE: { severity: "warning", isUserVisible: false, description: "管理者によりデバイスが解除されました" }, ADMIN_ACCOUNT_LOCK: { severity: "critical", isUserVisible: true, description: "管理者によりアカウントがロックされました" }, ADMIN_LOG_EXPORT: { severity: "info", isUserVisible: false, description: "監査ログが出力されました" } };



const getSecurityEventCatalogEntry = (type: SecurityEventType) => {
  const entry = SECURITY_EVENT_CATALOG[type];
  if (!entry) throw new Error(`Unknown security event type: ${type}`);
  return entry;
};



export { SECURITY_EVENT_CATALOG, getSecurityEventCatalogEntry };


export type { SecurityEventCatalogEntry };
