/* eslint-disable react-refresh/only-export-components -- context hook/provider are intentionally co-located exports. */
import { useMemo, type ReactNode } from "react";
import {
  AuthSessionProvider,
  useAuthSession,
} from "@/contexts/auth/AuthSessionContext";
import {
  SyncProvider,
  useSyncContext,
  useSyncServiceCompat,
} from "@/contexts/sync/SyncContext";
import {
  SecurityProvider,
  useSecurity,
} from "@/contexts/security/SecurityContext";
import type { ISyncService } from "@/services/interfaces/ISyncService";

type AuthContextCompatValue = ReturnType<typeof useAuthSession> &
  ReturnType<typeof useSyncContext> &
  ReturnType<typeof useSecurity> & {
    syncService: ISyncService | null;
  };

export { useAuthSession, useSyncContext, useSecurity };

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthSessionProvider>
      <SyncProvider>
        <SecurityProvider>{children}</SecurityProvider>
      </SyncProvider>
    </AuthSessionProvider>
  );
}

export function useAuth(): AuthContextCompatValue {
  const session = useAuthSession();
  const sync = useSyncContext();
  const security = useSecurity();
  const syncService = useSyncServiceCompat();

  return useMemo(
    () => ({
      ...session,
      ...sync,
      ...security,
      syncService,
    }),
    [security, session, sync, syncService],
  );
}
