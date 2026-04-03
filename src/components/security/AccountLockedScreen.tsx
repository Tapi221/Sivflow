import React from "react";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { useSecurity } from "@/contexts/security/SecurityContext";
import { Shield } from "@/ui/icons"; // IDE Check: Shield icon
// CSSはApp.tsx等でグローバル定義するか、インラインでシンプルに実装

export const AccountLockedScreen: React.FC = () => {
  const { securityState } = useSecurity();
  const { currentUser } = useAuthSession();

  if (!securityState.isLocked) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "#1a1a1a",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          backgroundColor: "#ef4444",
          padding: "var(--ui-space-8)",
          borderRadius: "50%",
          marginBottom: "var(--ui-space-8)",
        }}
      >
        <Shield size={64} color="#fff" />
      </div>

      <h1
        style={{
          marginBottom: "var(--ui-space-4)",
          fontSize: "var(--ui-font-size-2xl)",
        }}
      >
        Account Locked
      </h1>

      <p
        style={{
          maxWidth: "600px",
          fontSize: "var(--ui-font-size-md-plus)",
          lineHeight: "1.6",
          color: "#d1d5db",
        }}
      >
        セキュリティ上の理由により、このアカウントは一時的にロックされています。
        <br />
        不正なアクセスや、ポリシー違反の操作が検知された可能性があります。
      </p>

      <div
        style={{
          marginTop: "var(--ui-space-12)",
          padding: "var(--ui-space-4)",
          backgroundColor: "#333",
          borderRadius: "var(--ui-radius-sm)",
        }}
      >
        <p
          style={{ fontSize: "var(--ui-font-size-sm-plus)", color: "#9ca3af" }}
        >
          管理者にお問い合わせください。
          <br />
          Reference ID: {currentUser?.uid}
        </p>
      </div>
    </div>
  );
};
