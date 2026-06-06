import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { ExplorerRouteState } from "@/features/explorer/contracts/explorerRouteState";
import { createDefaultExplorerRouteState, resolveRouteTabBySection, WORKSPACE_DEFAULT_EXPLORER_TAB_ID, type WorkspaceCardTab, type WorkspaceDocumentTab, type WorkspaceExplorerTab