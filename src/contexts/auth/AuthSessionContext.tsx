import { useEffect, useMemo, useRef, useState } from "react";
import { auth, isFirebaseClientAvailable } from "@platform/firebase/client";
import type { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import type { AuthSessionContextType, AuthSessionProviderProps } from "./AuthSessionContextCore";
import { AuthSessionContext } from "./AuthSessionContextCore";
import { bootstrapUser } from "./bootstrapUser";
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
          console.warn("[Auth] 匿名ユーザー用ローカルDBの初期化に失敗しました:", error);
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
            console.warn("[Auth] Google Calendar アカウントの復元に失敗しました（致命的ではありません）:", error);
          }
        } catch (error) {
          console.error("[Auth] 初期セットアップで致命的なエラーが発生しました:", error);
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
        console.warn("[Auth] ログアウト時のDBリセットに失敗しました（致命的ではありません）:", error);
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
