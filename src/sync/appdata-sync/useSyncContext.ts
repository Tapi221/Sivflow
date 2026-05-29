import { useContext } from "react";
import { SyncContext } from "./SyncContextCore";

export const useSyncContext = () => useContext(SyncContext);
