import { useContext } from "react";
import { SyncContext } from "./SyncContextCore";

const useSyncContext = () => useContext(SyncContext);

export { useSyncContext };
