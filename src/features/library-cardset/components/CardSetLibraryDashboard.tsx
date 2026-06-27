import { useMemo } from "react";
import type { CardSetDashboardRow } from "@/features/library-cardset/model/cardSetLibraryRow";
import { buildCardSetDashboardRows } from "@/features/library-cardset/model/cardSetLibraryRow";
import { PdfLibraryWorkspaceToolbar } from "@/features/library-pdf/components/PdfLibraryWorkspaceToolbar";
import { useTags } from "@/features/settings/hooks/useTags";
import type { Card, CardSet, Folder } from "@/types";



type CardSetLibraryDashboardProps = {
  cards: Card[];
  cardSets: CardSet[];
  folders: Folder[];
  onOpenCardSet: (cardSetId: string) => void;
  showToolbar?: boolean;
};
type CardSetLibraryCardProps = {
  row: CardSetDashboardRow;
  onOpenCardSet: (cardSetId: string) => void;
};
type CardSetMetricProps = {
  label: string;
  value: string;
};



const CARD_CLASS_NAME = "group flex w-full min-w-0 flex-col rounded-2xl border border-stone-300 bg-[#fff] p-4 text-left shadow-[0_6px_18px_rgba(15,23,42,0.06)] outline-none transition-[border-color,box-shadow,transform,background-color] duration-150 ease-out hover:border-[#c9c7bf] hover:bg-stone-50 hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] active:scale-[0.99] focus-visible:border-[#a8a49a] focus-visible:ring-2 focus-visible:ring-[#d8d4c8] motion-reduce:transition-none motion-reduce:active:scale-100";
const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit" });
const NUMBER_FORMATTER = new Intl.NumberFormat("ja-JP");



const formatDate = (value: Date | null): string => {
  if (!value) return "未記録";
  return DATE_FORMATTER.format(value);
};
const formatCardCount = (value: number): string => {
  return `${NUMBER_FORMATTER.format(value)}枚`;
};
const getCardSetInitial = (title: string): string => {
  const trimmedTitle = title.trim();
  return trimmedTitle.length > 0 ? trimmedTitle.slice(0, 1).toUpperCase() : "F";
};



const CardSetMetric = ({ label, value }: CardSetMetricProps) => {
  return (
    <span className="flex min-w-0 flex-col gap-1 rounded-xl bg-[#f5f4ef] px-3 py-2">
      <span className="text-xs font-semibold leading-none tracking-wider text-[#8b8780] uppercase">
        {label}
      </span>
      <span className="truncate text-xs font-bold leading-none text-[#35312b]">
        {value}
      </span>
    </span>
  );
};
const CardSetLibraryCard = ({ row, onOpenCardSet }: CardSetLibraryCardProps) => {
  const updatedAt = row.updatedAt ?? row.createdAt;
  const shouldRenderDescription = row.description !== null && row.description !== undefined && row.description.length > 0;
  const shouldRenderTags = row.tags.length > 0;

  return (
    <button
      type="button"
      className={CARD_CLASS_NAME}
      onClick={() => onOpenCardSet(row.id)}
      aria-label={`${row.title}を開く`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f0eee7] text-lg font-bold text-[#6f675d] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
          {getCardSetInitial(row.title)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-bold leading-5 tracking-tight text-stone-900">
            {row.title}
          </span>
          <span className="truncate text-xs font-medium leading-5 text-stone-500">
            {row.folderPathLabel}
          </span>
        </span>
      </div>
      {shouldRenderDescription && (
        <p className="mt-3 line-clamp-2 text-xs font-medium leading-6 text-[#66615a]">
          {row.description}
        </p>
      )}
      {shouldRenderTags && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {row.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[#f2f0ea] px-2 py-1 text-xs font-semibold leading-none text-[#7b7469]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <CardSetMetric label="Cards" value={formatCardCount(row.cardCount)} />
        <CardSetMetric label="Updated" value={formatDate(updatedAt)} />
      </div>
    </button>
  );
};
const CardSetLibraryDashboard = ({
  cards,
  cardSets,
  folders,
  onOpenCardSet,
  showToolbar = true,
}: CardSetLibraryDashboardProps) => {
  const { tagById } = useTags();

  const rows = useMemo(() => {
    return buildCardSetDashboardRows({ cards, cardSets, folders, tagById });
  }, [cards, cardSets, folders, tagById]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#fff]">
      {showToolbar && (
        <PdfLibraryWorkspaceToolbar
          activeSection="flashcard"
          onSelectSection={() => undefined}
        />
      )}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-4 sm:px-6">
        {rows.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <CardSetLibraryCard
                key={row.id}
                row={row}
                onOpenCardSet={onOpenCardSet}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 text-center">
            <p className="text-sm font-bold text-[#3f3a33]">
              カードセットがありません
            </p>
            <p className="mt-2 max-w-72 text-xs font-medium leading-7 text-[#7c756c]">
              フォルダにカードセットを作成すると、ここに表示されます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};



export { CardSetLibraryDashboard };


export type { CardSetLibraryDashboardProps };
