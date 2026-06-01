import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { useEffect, useMemo, useRef, useState } from "react";
import { bootstrapUser } from "@/hooks/bootstrap/useUserBootstrap";
import { hydrateServerStoredGoogleCalendarAccounts } from "@/integration/googlecalendar-integration/gcal.server-account-list";
import { auth } from "@/services/firebase";
import { initializeDB, resetLocalDBForLogout } from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";
import { AuthSessionContext, type AuthSessionProviderProps, type AuthSessionContextType } from "./AuthSessionContextCore";

const AuthSessionProvider = ({ children }: AuthSessionProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastKnownUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        lastKnownUserIdRef.current = user.uid;

        try {
          await bootstrapUser(user.uid);

          try {
            const hydratedGoogleAccountCount = await hydrateServerStoredGoogleCalendarAccounts();
            if (hydratedGoogleAccountCount > 0) {
              window.location.reload();
              return;
            }
          } catch (error) {
            console.warn("[Auth] Google Calendar account hydration failed (non-fatal):", error);
          }
        } catch (error) {
          console.error("[Auth] Fatal setup error:", error);
        } finally {
          setCurrentUser(user);
          setLoading(false);
        }
        return;
      }

      const previousUserId = lastKnownUserIdRef.current || undefined;
      try {
        await resetLocalDBForLogout(previousUserId);
        await initializeDB("anonymous");
      } catch (error) {
        console.warn("[Auth] Logout DB reset failed (non-fatal):", error);
      }

      SyncServiceFactory.resetInstance(previousUserId);
      lastKnownUserIdRef.current = null;
      setCurrentUser(null);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    setLoading(true);

    try {
      await signOut(auth);
    } catch (error) {
      setLoading(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = useMemo<AuthSessionContextType>(
    () => ({
      currentUser,
      loading,
      logout,
    }),
    [currentUser, loading],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};

export { AuthSessionProvider };
export type { AuthSessionProviderProps };
