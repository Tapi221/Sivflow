import { createContext } from "react";
import type { ReactNode } from "react";



type WorkspaceLayoutRevisionProviderProps = {
  children: ReactNode;
  revision: number;
};



const WorkspaceLayoutRevisionContext = createContext(0);



const WorkspaceLayoutRevisionProvider = ({ children, revision }: WorkspaceLayoutRevisionProviderProps) => {
  return <WorkspaceLayoutRevisionContext.Provider value={revision}>{children}</WorkspaceLayoutRevisionContext.Provider>;
};



export { WorkspaceLayoutRevisionProvider };
