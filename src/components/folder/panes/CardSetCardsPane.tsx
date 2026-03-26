import { useCards } from "@/hooks/card/useCards";
import { useCardSets } from "@/hooks/cardSet/useCardSets";
import { cn } from "@/lib/utils";
import type { Card } from "@/types";
import { FileText, Plus } from "@/ui/icons";

interface CardSetCardsPaneProps {
  folderId: string;
  cardSetId: string;
  selectedCardId: string | null;
  onCardSelect: (cardId: string) => void;
}

const getCardTitle = (card: Card): string => {
  const t = card.title?.trim();
  if (t) return t;
  return "無題のカード";
};

export function CardSetCardsPane({
  folderId,
  cardSetId,
  selectedCardId,
  onCardSelect,
}: CardSetCardsPaneProps) {
  const { cards, loading, createCard } = useCards(folderId, cardSetId);
  const { cardSets } = useCardSets(folderId);
  const selectedCardSet = cardSets.find((cs) => cs.id === cardSetId) ?? null;

  const handleCreateCard = async () => {
    const created = await createCard({
      folderId,
      cardSetId,
      title: "",
      blocks: [],
    });
    const createdCardId =
      (created as { id?: string; cardId?: string } | null)?.id ??
      (created as { id?: string; cardId?: string } | null)?.cardId;
    if (createdCardId) {
      onCardSelect(createdCardId);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-400">
        読み込み中...
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-slate-700">
            {selectedCardSet?.name ?? "カードセット"}
          </h2>
          <p className="text-xs text-slate-400">{cards.length} 件のカード</p>
        </div>
        <button
          type="button"
          onClick={() => void handleCreateCard()}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          <Plus className="h-3 w-3" />
          新規カード
        </button>
      </div>

      {cards.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <FileText className="h-9 w-9 text-slate-300" />
          <p className="text-sm text-slate-400">このカードセットにカードはありません</p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {cards.map((card, idx) => (
            <li key={card.id}>
              <button
                type="button"
                onClick={() => onCardSelect(card.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--sidebar-active-accent,#7aa6a1)]",
                  selectedCardId === card.id
                    ? "border-[color-mix(in_srgb,var(--sidebar-active-accent,#7aa6a1)_45%,transparent)] bg-[var(--sidebar-active-bg,#e7ebef)] text-[var(--sidebar-text,#202123)]"
                    : "border-transparent text-slate-700 hover:bg-[var(--sidebar-active-bg,#e7ebef)]",
                )}
              >
                <span className="w-6 shrink-0 text-xs tabular-nums text-slate-400">
                  {idx + 1}
                </span>
                <span className="truncate text-sm">{getCardTitle(card)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

