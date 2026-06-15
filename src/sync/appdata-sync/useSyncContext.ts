import { useContext } from "react";
import { SyncContext } from "@/sync/appdata-sync/SyncContextCore";

const useSyncContext = () => useContext(SyncContext);

export { useSyncContext };
