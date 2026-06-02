import { createContext, type ReactNode } from "react";
import type { SyncConflict } from "@/types/domain/sync";

export type SyncStatus = "idle" | "syncing" | "success" | "error";
export type SyncNotice = "none" | "wifi_wait" | "offline" | "error";
export type SyncTableName = "cards" | "folders" | "cardSets" | "documents" | "tagRecords" | "userSettings" | "images";

export interface SyncContextType {
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

export interface SyncProviderProps {
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

export const SyncContext = createContext<SyncContextType>(defaultSyncContext);
