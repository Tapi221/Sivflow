import { createContext, useContext } from "react";

interface ExplorerEditingContextValue {
  editingId: string | null;
  editingName: string;
  setEditingId: (id: string | null) => void;
  setEditingName: (name: string) => void;
  editingNameRef: React.MutableRefObject<string>;
  renameCancelledRef: React.MutableRefObject<boolean>;
  handleRenameConfirm: () => Promise<void>;
}

export const ExplorerEditingContext =
  createContext<ExplorerEditingContextValue | null>(null);

export function useExplorerEditing(): ExplorerEditingContextValue {
  const ctx = useContext(ExplorerEditingContext);
  if (!ctx) throw new Error("ExplorerEditingContext not provided");
  return ctx;
}
