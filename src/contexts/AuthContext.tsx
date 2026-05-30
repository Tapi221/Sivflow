import { type ReactNode } from "react";
import { AuthSessionProvider, useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { SecurityProvider, useSecurity } from "@/contexts/security/SecurityContext";
import { SyncProvider } from "@/sync/appdata-sync/SyncContext";
import { useSyncContext } from "@/sync/appdata-sync/useSyncContext";

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
