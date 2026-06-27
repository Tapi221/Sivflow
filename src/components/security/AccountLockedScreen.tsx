import React from "react";
import { Shield } from "@web-renderer/chip/icons/icons";
// IDE Check: Shield icon
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import { useSecurity } from "@/contexts/security/SecurityContext";



// CSSはApp.tsx等でグローバル定義するか、インラインでシンプルに実装
const AccountLockedScreen: React.FC = () => {
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
        backgroundColor: "rgba(0, 0, 0, 0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div style={{ textAlign: "center", color: "white", padding: 32 }}>
        <Shield size={48} />
        <h1>Account Locked</h1>
        <p>{currentUser?.email ?? "Your account"} has been locked for security reasons.</p>
      </div>
    </div>
  );
};



export { AccountLockedScreen };
