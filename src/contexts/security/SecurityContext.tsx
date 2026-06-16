import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuthSession } from "@/contexts/auth/useAuthSession";
import type { SecurityState } from "@/services/interfaces/ISyncService";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";



interface SecurityContextType {
  securityState: SecurityState;
  dismissSecurityAlert: (alertId: string) => Promise<void>;
}
interface SecurityProviderProps {
  children: ReactNode;
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



const useSecurity = () => {
  return useContext(SecurityContext);
};



const SecurityProvider = ({ children }: SecurityProviderProps) => {
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
    if (!currentUser) return;

    let active = true;
    let stopMonitoring: (() => void) | undefined;

    const setupMonitoring = async () => {
      const syncService = await SyncServiceFactory.getInstance(currentUser.uid);
      if (!active) return;

      stopMonitoring = syncService.monitorSecurity((newState) => {
        console.log("[セキュリティ] セキュリティ状態を更新しました:", newState);
        setSecurityState(newState);
      });
    };

    void setupMonitoring();

    return () => {
      active = false;
      stopMonitoring?.();
    };
  }, [currentUser]);

  const resolvedSecurityState = currentUser
    ? securityState
    : defaultSecurityState;

  const value = useMemo<SecurityContextType>(
    () => ({
      securityState: resolvedSecurityState,
      dismissSecurityAlert,
    }),
    [dismissSecurityAlert, resolvedSecurityState],
  );

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};



export { useSecurity, SecurityProvider };
