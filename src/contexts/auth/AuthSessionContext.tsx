import { useEffect, useMemo, useRef, useState } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { AuthSessionContextType, AuthSessionProviderProps } from "@/contexts/auth/AuthSessionContextCore";
import { AuthSessionContext } from "@/contexts/auth/AuthSessionContextCore";
import { bootstrapUser } from "@/contexts/auth/bootstrapUser";
import { auth, isFirebaseClientAvailable } from "@/infrastructure/firebase/client";
import { hydrateServerStoredGoogleCalendarAccounts } from "@/integration/googlecalendar-integration/gcal.server-account-list";
import { initializeDB, resetLocalDBForLogout } from "@/services/localdb";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";

const refreshAuthProfile = async (user: FirebaseUser): Promise<FirebaseUser> => {
  await user.reload();
  return auth?.currentUser ?? user;
};

const AuthSessionProvider = ({ children }: AuthSessionProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastKnownUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isFirebaseClientAvailable || !auth) {
      initializeDB("anonymous")
        .catch((error) => {
          console.warn("[Auth] Anonymous local DB initialization failed:", error);
        })
        .finally(() => {
          setCurrentUser(null);
          setLoading(false);
        });
      return undefined;
    }

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
          setCurrentUser(await refreshAuthProfile(user));
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
    if (!isFirebaseClientAvailable || !auth) {
      await resetLocalDBForLogout(lastKnownUserIdRef.current || undefined);
      await initializeDB("anonymous");
      setCurrentUser(null);
      setLoading(false);
      return;
    }

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
