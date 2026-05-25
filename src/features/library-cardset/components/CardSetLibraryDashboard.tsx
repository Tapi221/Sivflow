import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import type { Card, CardSet, Folder } from "@/types";

type CardSetLibraryDashboardProps = {
  cards: Card[];
  cardSets: CardSet[];
  folders: Folder[];
  onOpenCardSet: (cardSetId: string) => void;
  showToolbar?: boolean;
};

const CardSetLibraryDashboard = ({
  showToolbar = true,
}: CardSetLibraryDashboardProps) => {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
      {showToolbar ? (
        <PdfLibraryWorkspaceToolbar
          activeSection="flashcard"
          onSelectSection={() => undefined}
        />
      ) : null}
      <div className="min-h-0 flex-1" />
    </div>
  );
};

export { CardSetLibraryDashboard };
export default CardSetLibraryDashboard;