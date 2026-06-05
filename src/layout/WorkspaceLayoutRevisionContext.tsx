import { createContext, useContext, type ReactNode } from "react";

type WorkspaceLayoutRevisionProviderProps = {
  children: ReactNode;
  revision: number;
};

const WorkspaceLayoutRevisionContext = createContext(0);

const useWorkspaceLayoutRevision = () => {
  return useContext(WorkspaceLayoutRevisionContext);
};

const WorkspaceLayoutRevisionProvider = ({ children, revision }: WorkspaceLayoutRevisionProviderProps) => {
  return <WorkspaceLayoutRevisionContext.Provider value={revision}>{children}</WorkspaceLayoutRevisionContext.Provider>;
};

export { WorkspaceLayoutRevisionProvider, useWorkspaceLayoutRevision };
