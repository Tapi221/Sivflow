import { createContext, useContext } from "react";

const WorkspaceLayoutRevisionContext = createContext(0);

const useWorkspaceLayoutRevision = () => {
  return useContext(WorkspaceLayoutRevisionContext);
};

export { WorkspaceLayoutRevisionContext, useWorkspaceLayoutRevision };
