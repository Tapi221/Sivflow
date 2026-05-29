import { useContext } from "react";
import { SyncContext } from "./SyncContextCore";

export const useSyncContext = () => {
  return useContext(SyncContext);
};
