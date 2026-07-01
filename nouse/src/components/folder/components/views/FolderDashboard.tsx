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



const FolderDashboard = (_: FolderDashboardProps) => {
  return <div className="h-full bg-transparent" />;
};



export { FolderDashboard };
