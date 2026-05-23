import { useMemo } from "react";

import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import { buildCardSetDashboardRows } from "@/features/library-cardset/model/cardSetLibraryRow";

import { useTags } from "@/hooks/settings/useTags";
import type { Card, CardSet, Folder } from "@/types";

type CardSetLibraryDashboardProps = {
  cards: Card[];
  cardSets: CardSet[];
  folders: Folder[];
  onOpenCardSet: (cardSetId: string) => void;
};

const CardSetLibraryDashboard = ({
  cards,
  cardSets,
  folders,
  onOpenCardSet,
}: CardSetLibraryDashboardProps) => {
  const { tagById } = useTags();

  const rows = useMemo(() => {
    return buildCardSetDashboardRows({
      cardSets,
      cards,
      folders,
      tagById,
    });
  }, [cardSets, cards, folders, tagById]);

  void onOpenCardSet;

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
        <PdfLibraryWorkspaceToolbar
          activeSection="flashcard"
          onSelectSection={() => undefined}
        />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-2xl rounded-[10px] border border-[#e5e7eb] bg-[#FFFFFF] p-8">
            <div className="inline-flex rounded-[999px] bg-[#f3f4f6] px-3 py-1 text-[12px] font-semibold text-[#4b5563]">
              Flashcard ライブラリ
            </div>
            <h2 className="mt-5 text-[30px] font-semibold tracking-[-0.03em] text-[#20262a]">
              カードセットがまだありません
            </h2>
            <p className="mt-3 max-w-xl text-[14px] leading-7 text-[#6f7b78]">
              カードセットを作成すると、この画面で管理できます。
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#FFFFFF]">
      <PdfLibraryWorkspaceToolbar
        activeSection="flashcard"
        onSelectSection={() => undefined}
      />
      <div className="min-h-0 flex-1" />
    </div>
  );
};

export { CardSetLibraryDashboard };
export default CardSetLibraryDashboard;
