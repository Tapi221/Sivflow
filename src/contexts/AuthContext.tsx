/* eslint-disable react-refresh/only-export-components -- context hook/provider are intentionally co-located exports. */
import { type ReactNode, useMemo } from "react";
import { AuthSessionProvider, useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { SecurityProvider, useSecurity } from "@/contexts/security/SecurityContext";
import { SyncProvider } from "@/sync/SyncContext";
import { useSyncContext } from "@/sync/useSyncContext";

export { useAuthSession, useSecurity, useSyncContext };

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <AuthSessionProvider>
      <SyncProvider>
        <SecurityProvider>{children}</SecurityProvider>
      </SyncProvider>
    </AuthSessionProvider>
  );
};

// @deprecated
// 新規実装では useAuth を使用しないこと
// useAuthSession / useSyncContext / useSecurity を使用する
export const useAuth = () => {
  const session = useAuthSession();
  const sync = useSyncContext();
  const security = useSecurity();

  return useMemo(
    () => ({
      ...session,
      ...sync,
      ...security,
    }),
    [security, session, sync],
  );
};
