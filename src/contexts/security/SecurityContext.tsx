import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuthSession } from "@/contexts/auth/AuthSessionContext";
import { useSyncServiceCompat } from "@/contexts/sync/SyncContext";
import type { SecurityState } from "@/services/logic/SecurityMonitor";

interface SecurityContextType {
  securityState: SecurityState;
  dismissSecurityAlert: (alertId: string) => Promise<void>;
}

const defaultSecurityState: SecurityState = {
  isLocked: false,
  requires2FA: false,
  alerts: [],
};

const SecurityContext = createContext<SecurityContextType>({
  securityState: defaultSecurityState,
  dismissSecurityAlert: async () => {},
});

export function useSecurity() {
  return useContext(SecurityContext);
}

interface SecurityProviderProps {
  children: ReactNode;
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { currentUser } = useAuthSession();
  const syncService = useSyncServiceCompat();
  const [securityState, setSecurityState] =
    useState<SecurityState>(defaultSecurityState);

  const dismissSecurityAlert = useCallback(
    async (alertId: string) => {
      if (!syncService) return;
      await syncService.dismissSecurityAlert(alertId);
    },
    [syncService],
  );

  useEffect(() => {
    if (!currentUser || !syncService) {
      setSecurityState(defaultSecurityState);
      return;
    }

    const stopMonitoring = syncService.monitorSecurity((newState) => {
      console.log("[Security] Security state updated:", newState);
      setSecurityState(newState);
    });

    return () => {
      stopMonitoring();
    };
  }, [currentUser, syncService]);

  const value = useMemo<SecurityContextType>(
    () => ({
      securityState,
      dismissSecurityAlert,
    }),
    [dismissSecurityAlert, securityState],
  );

  return (
    <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>
  );
}
