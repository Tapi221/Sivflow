import type { ReactNode } from "react";
import { AuthSessionProvider } from "@/contexts/auth/AuthSessionContext";
import { SecurityProvider } from "@/contexts/security/SecurityContext";
import { SyncProvider } from "@/sync/appdata-sync/SyncContext";



type AuthProviderProps = {
  children: ReactNode;
};



const AuthProvider = ({ children }: AuthProviderProps) => {
  return (
    <AuthSessionProvider>
      <SyncProvider>
        <SecurityProvider>{children}</SecurityProvider>
      </SyncProvider>
    </AuthSessionProvider>
  );
};



export { AuthProvider };


export type { AuthProviderProps };
