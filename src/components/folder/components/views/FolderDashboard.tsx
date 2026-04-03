import type { Card } from "@/types";

type FolderDashboardHandlers = {
  onStartStudy: () => void;
  onViewCards: () => void;
  onCreateCard: () => void;
};

interface FolderDashboardProps {
  folderId: string;
  folderName: string;
  cards: Card[];
  handlers: FolderDashboardHandlers;
  onRenameFolder?: (newName: string) => Promise<void>;
  folderSelectionNonce?: number;
}

export function FolderDashboard(_: FolderDashboardProps) {
  return <div style={{ height: "100%", background: "#ffffff" }} />;
}
