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
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
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
  const [securityState, setSecurityState] =
    useState<SecurityState>(defaultSecurityState);

  const dismissSecurityAlert = useCallback(
    async (alertId: string) => {
      if (!currentUser) return;

      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      await syncService.dismissSecurityAlert(alertId);
    },
    [currentUser],
  );

  useEffect(() => {
    if (!currentUser) {
      setSecurityState(defaultSecurityState);
      return;
    }

    let active = true;
    let stopMonitoring: (() => void) | undefined;

    const setupMonitoring = async () => {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      if (!active) return;

      stopMonitoring = syncService.monitorSecurity((newState) => {
        console.log("[Security] Security state updated:", newState);
        setSecurityState(newState);
      });
    };

    void setupMonitoring();

    return () => {
      active = false;
      stopMonitoring?.();
    };
  }, [currentUser]);

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
