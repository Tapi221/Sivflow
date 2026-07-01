import { createContext } from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { ReactNode } from "react";



type AuthSessionContextType = {
  currentUser: FirebaseUser | null;
  loading: boolean;
  logout: () => Promise<void>;
};
type AuthSessionProviderProps = {
  children: ReactNode;
};



const noopLogout = async () => {};



const AuthSessionContext = createContext<AuthSessionContextType>({
  currentUser: null,
  loading: true,
  logout: noopLogout,
});



export { AuthSessionContext };


export type { AuthSessionContextType, AuthSessionProviderProps };
