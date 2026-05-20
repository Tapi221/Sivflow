import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { onAuthStateChanged,type User as FirebaseUser } from "firebase/auth";

import { bootstrapUser } from "@/hooks/bootstrap/useUserBootstrap";
import { auth } from "@/services/firebase";
import { initializeDB, resetLocalDBForLogout } from "@/services/localDB";
import { SyncServiceFactory } from "@/services/SyncServiceFactory";

interface AuthSessionContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
}

const AuthSessionContext = createContext<AuthSessionContextType>({
  currentUser: null,
  loading: true,
});

// eslint-disable-next-line react-refresh/only-export-components
export const useAuthSession = () => {
  return useContext(AuthSessionContext);
};

interface AuthSessionProviderProps {
  children: ReactNode;
}

export const AuthSessionProvider = ({ children }: AuthSessionProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const lastKnownUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let isInitialCall = true;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (isInitialCall) {
        isInitialCall = false;
      }

      if (user) {
        lastKnownUserIdRef.current = user.uid;

        try {
          await bootstrapUser(user.uid);
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

  const value = useMemo<AuthSessionContextType>(
    () => ({
      currentUser,
      loading,
    }),
    [currentUser, loading],
  );

  return (
    <AuthSessionContext.Provider value={value}>
      {children}
    </AuthSessionContext.Provider>
  );
};
