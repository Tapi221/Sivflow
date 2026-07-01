import React from "react";
import { AlertTriangle, X } from "@web-renderer/chip/icons/icons";
import { useSecurity } from "@/contexts/security/SecurityContext";



const SecurityAlertBanner: React.FC = () => {
  const { securityState, dismissSecurityAlert } = useSecurity();

  // アラートがない、かつロックも2FA要求もない場合は表示しない
  if (
    securityState.alerts.length === 0 &&
    !securityState.isLocked &&
    !securityState.requires2FA
  )
    return null;

  return (
    <div className="flex flex-col gap-1">
      {/* 2FA要求の警告 */}
      {securityState.requires2FA && (
        <div
          style={{
            backgroundColor: "#eff6ff", // blue-50
            borderBottom: "1px solid #93c5fd", // blue-300
            padding: "var(--ui-space-3) var(--ui-space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--ui-space-2)",
            color: "#1d4ed8", // blue-700
            fontSize: "var(--ui-font-size-sm-plus)",
          }}
        >
          <AlertTriangle size={18} />
          <span>
            セキュリティ設定: 次回のログイン時に2段階認証が要求されます。
          </span>
        </div>
      )}

      {/* 個別のセキュリティアラート */}
      {securityState.alerts.map((alert) => (
        <div
          key={alert.id}
          style={{
            backgroundColor: "#fff7ed", // orange-50
            borderBottom: "1px solid #fdba74", // orange-300
            padding: "var(--ui-space-3) var(--ui-space-4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "#c2410c", // orange-700
            fontSize: "var(--ui-font-size-sm-plus)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--ui-space-2)",
            }}
          >
            <AlertTriangle size={18} />
            <span>
              {alert.message ??
                "セキュリティ警告: 不審なアクティビティが検知されました。"}
            </span>
          </div>
          <button
            onClick={() => void dismissSecurityAlert(alert.id)}
            className="p-1 hover:bg-orange-100 rounded-full transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};



export { SecurityAlertBanner };
