import { createContext } from "react";
import type { ReactNode } from "react";
import type { SyncConflict } from "@/types/domain/sync";



type SyncStatus = "idle" | "syncing" | "success" | "error";
type SyncNotice = "none" | "wifi_wait" | "offline" | "error";
type SyncTableName = "cards" | "folders" | "cardSets" | "documents" | "tagRecords" | "userSettings" | "images";
interface SyncContextType {
  syncStatus: SyncStatus;
  syncNotice: SyncNotice;
  lastSyncTime: Date | null;
  queueCount: number;
  conflictCount: number;
  triggerSync: () => Promise<void>;
  reloadSyncSettings: () => Promise<void>;
  getUnresolvedConflicts: () => Promise<SyncConflict[]>;
  resolveConflict: (conflictId: string, resolvedData: unknown) => Promise<void>;
  clearSyncErrors: () => Promise<void>;
}
interface SyncProviderProps {
  children: ReactNode;
}



const defaultSyncContext: SyncContextType = {
  syncStatus: "idle",
  syncNotice: "none",
  lastSyncTime: null,
  queueCount: 0,
  conflictCount: 0,
  triggerSync: async () => {},
  reloadSyncSettings: async () => {},
  getUnresolvedConflicts: async () => [],
  resolveConflict: async () => {},
  clearSyncErrors: async () => {},
};
const SyncContext = createContext<SyncContextType>(defaultSyncContext);



export { SyncContext };


export type { SyncStatus, SyncNotice, SyncTableName, SyncContextType, SyncProviderProps };
