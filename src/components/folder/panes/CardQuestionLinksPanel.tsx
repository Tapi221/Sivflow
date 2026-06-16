import { memo, useCallback, useMemo, useState } from "react";
import { Link, Plus } from "@web-renderer/chip/icons";
import { LoadingSpinner } from "@web-renderer/components/common/LoadingSpinner";
import { cn } from "@web-renderer/lib/utils";
import { useLiveQuery } from "dexie-react-hooks";
import { useCardCommands } from "@/components/card/hooks/useCardCommands";
import { useEffectiveLocalUserId } from "@/contexts/auth/useEffectiveLocalUserId";
import { useToast } from "@/contexts/ToastContext";
import { normalizeCard } from "@/domain/card/normalizers/normalizeCard";
import { buildCardSetById, resolveCardFolderIdStrict } from "@/domain/card/selectors/cardFolder";
import { useWorkspaceTabsStore } from "@/pane.desktop/tab.desktopnative/hooks/useTabsStore";
import { getLocalDb } from "@/services/localdb";
import type { Card, CardBlock } from "@/types/domain/card";
import type { CardSet } from "@/types/domain/cardSet";



type CardQuestionLinksPanelProps = {
  selectedCardId: string | null;
};
type CardRelationRecord = {
  id: string;
  userId: string;
  fromCardId?: string;
  toCardId?: string;
  term?: string;
  reason?: string;
  createdAt?: Date;
  updatedAt?: Date;
  isDeleted?: boolean;
};
type QuestionLinksSnapshot = {
  card: Card;
  outgoingRelations: CardRelationRecord[];
  incomingRelations: CardRelationRecord[];
  linkedCards: Card[];
  cardSetById: ReadonlyMap<string, CardSet>;
};



const MAX_CANDIDATE_TERMS = 8;
const MAX_CUSTOM_TERM_LENGTH = 60;
const TERM_PATTERN = /[A-Za-z][A-Za-z0-9+\-/#]{1,24}|[\p{Script=Han}\p{Script=Katakana}ー]{2,16}/gu;
const TERM_STOP_WORDS = new Set(["card", "cards", "qa", "q", "a", "これ", "それ", "この", "その", "こと", "もの", "ため", "よう", "カード", "問題", "解答", "回答", "質問", "疑問", "リンク", "する", "いる", "ある", "なる"]);



const isCardRelationRecord = (value: unknown): value is CardRelationRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CardRelationRecord>;
  return typeof record.id === "string" && typeof record.userId === "string";
};
const isCardSet = (value: unknown): value is CardSet => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<CardSet>;
  return typeof record.id === "string" && !record.isDeleted;
};
const getBlockText = (block: CardBlock): string => {
  return [block.questionTitle, block.questionAnswer, block.content, block.markdown]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
};
const normalizeTerm = (value: string): string => value.replace(/[、。,.!?！？:：;；()[\]{}「」『』]/g, "").trim();
const isUsefulTerm = (term: string): boolean => {
  if (term.length < 2 || term.length > MAX_CUSTOM_TERM_LENGTH) return false;
  if (/^\d+$/.test(term)) return false;
  return !TERM_STOP_WORDS.has(term.toLowerCase());
};
const extractQuestionTerms = (card: Card | null): string[] => {
  if (!card) return [];
  const sourceText = [card.title, ...card.front.blocks.map(getBlockText), ...card.back.blocks.map(getBlockText)]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const terms: string[] = [];
  const usedTerms = new Set<string>();

  for (const match of sourceText.matchAll(TERM_PATTERN)) {
    const term = normalizeTerm(match[0] ?? "");
    const key = term.toLowerCase();
    if (!isUsefulTerm(term) || usedTerms.has(key)) continue;
    usedTerms.add(key);
    terms.push(term);
    if (terms.length >= MAX_CANDIDATE_TERMS) break;
  }

  return terms;
};
const getCardTitle = (card: Card): string => (card.title?.trim() || card.front.blocks.map(getBlockText).find((text) => text.trim().length > 0)?.trim() || card.questionNumber) ?? "無題のカード";
const sanitizeCustomTerm = (value: string): string => normalizeTerm(value).slice(0, MAX_CUSTOM_TERM_LENGTH);
const getResolvedCardFolderId = (card: Card, cardSetById: ReadonlyMap<string, CardSet>): string | null => resolveCardFolderIdStrict(card, cardSetById);



const CardQuestionLinksPanelComponent = ({ selectedCardId }: CardQuestionLinksPanelProps) => {
  const userId = useEffectiveLocalUserId();
  const toast = useToast();
  const { createCard } = useCardCommands();
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);
  const [isOpen, setIsOpen] = useState(false);
  const [customTerm, setCustomTerm] = useState("");
  const [creatingTerm, setCreatingTerm] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const snapshot = useLiveQuery(async (): Promise<QuestionLinksSnapshot | null> => {
    if (!userId || !selectedCardId) return null;
    const db = await getLocalDb(userId);
    const rawCard = await db.cards.get(selectedCardId);
    if (!rawCard) return null;
    const card = normalizeCard(rawCard);
    const [rawOutgoingRelations, rawIncomingRelations] = await Promise.all([
      db.cardRelations.where("fromCardId").equals(selectedCardId).toArray(),
      db.cardRelations.where("toCardId").equals(selectedCardId).toArray(),
    ]);
    const outgoingRelations = rawOutgoingRelations.filter(isCardRelationRecord).filter((relation) => !relation.isDeleted);
    const incomingRelations = rawIncomingRelations.filter(isCardRelationRecord).filter((relation) => !relation.isDeleted);
    const linkedCardIds = Array.from(new Set([...outgoingRelations.map((relation) => relation.toCardId), ...incomingRelations.map((relation) => relation.fromCardId)].filter((id): id is string => typeof id === "string" && id.length > 0)));
    const linkedCards = linkedCardIds.length > 0 ? (await db.cards.bulkGet(linkedCardIds)).filter((item): item is Card => Boolean(item)).map(normalizeCard).filter((item) => !item.isDeleted) : [];
    const cardSetIds = Array.from(new Set([card.cardSetId, ...linkedCards.map((linkedCard) => linkedCard.cardSetId)].filter((id): id is string => typeof id === "string" && id.length > 0)));
    const cardSets = cardSetIds.length > 0 ? (await db.cardSets.bulkGet(cardSetIds)).filter(isCardSet) : [];
    const cardSetById = buildCardSetById(cardSets);
    return { card, outgoingRelations, incomingRelations, linkedCards, cardSetById };
  }, [userId, selectedCardId, refreshNonce], null);

  const card = snapshot?.card ?? null;
  const cardSetById = snapshot?.cardSetById ?? null;
  const candidateTerms = useMemo(() => extractQuestionTerms(card), [card]);
  const linkedCount = (snapshot?.outgoingRelations.length ?? 0) + (snapshot?.incomingRelations.length ?? 0);

  const handleCreateLinkedQuestion = useCallback(async (rawTerm: string) => {
    const term = sanitizeCustomTerm(rawTerm);
    if (!term || !card || !cardSetById || !userId || creatingTerm) return;
    setCreatingTerm(term);

    try {
      const questionTitle = `${term}って何？`;
      const folderId = getResolvedCardFolderId(card, cardSetById);
      const createdCard = await createCard({
        title: questionTitle,
        folderId: folderId ?? undefined,
        cardSetId: card.cardSetId,
        isDraft: true,
        hasUncertainty: true,
        front: { blocks: [{ id: crypto.randomUUID(), type: "question", orderIndex: 0, questionTitle, questionAnswer: "" }] },
        back: { blocks: [{ id: crypto.randomUUID(), type: "text", orderIndex: 0, content: "" }] },
      });
      const db = await getLocalDb(userId);
      const now = new Date();
      await db.addItem("cardRelations", { id: crypto.randomUUID(), userId, fromCardId: card.id, toCardId: createdCard.id, term, reason: "unknown-term", createdAt: now, updatedAt: now, isDeleted: false }, true);
      setCustomTerm("");
      setIsOpen(true);
      setRefreshNonce((value) => value + 1);
      openCardTab({ cardId: createdCard.id, title: getCardTitle(createdCard), folderId });
      toast.success("疑問リンクを作成しました。");
    } catch (error) {
      console.error("[CardQuestionLinksPanel] failed to create linked question", error);
      toast.error("疑問リンクを作成できませんでした。");
    } finally {
      setCreatingTerm(null);
    }
  }, [card, cardSetById, createCard, creatingTerm, openCardTab, toast, userId]);

  const handleCreateCustomQuestion = useCallback(() => {
    void handleCreateLinkedQuestion(customTerm);
  }, [customTerm, handleCreateLinkedQuestion]);

  const handleOpenLinkedCard = useCallback((linkedCard: Card) => {
    if (!cardSetById) return;
    openCardTab({ cardId: linkedCard.id, title: getCardTitle(linkedCard), folderId: getResolvedCardFolderId(linkedCard, cardSetById) });
  }, [cardSetById, openCardTab]);

  if (!selectedCardId || !snapshot?.card) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-40 flex justify-center px-3">
      <div className="pointer-events-auto w-full max-w-96 overflow-hidden rounded-2xl border border-stone-300 bg-white/92 shadow-[0_18px_48px_rgba(15,23,42,0.16)] backdrop-blur-xl">
        <button type="button" className="flex h-10 w-full items-center gap-2 px-3 text-left text-xs font-semibold tracking-tight text-[#343434] transition hover:bg-[#f7f6f2]" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen}>
          <Link className="h-4 w-4 text-[#85827e]" />
          <span className="min-w-0 flex-1 truncate">疑問リンク</span>
          <span className="rounded-full border border-stone-300 bg-[#f7f6f2] px-2 py-1 text-xs leading-none text-[#77736d]">{linkedCount}</span>
        </button>
        {isOpen ? (
          <div className="border-t border-[#eceae4] px-3 pb-3 pt-2">
            <div className="space-y-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9a9690]">この回答から作る</p>
              <div className="flex flex-wrap gap-1.5">
                {candidateTerms.length > 0 ? candidateTerms.map((term) => (
                  <button key={term} type="button" className="inline-flex h-7 max-w-44 items-center gap-1 rounded-lg border border-stone-300 bg-[#f7f6f2] px-2 text-xs font-medium text-[#5f5f5f] transition hover:bg-slate-100 disabled:opacity-60" onClick={() => void handleCreateLinkedQuestion(term)} disabled={creatingTerm !== null} title={`${term} から疑問を作る`}>
                    {creatingTerm === term ? <LoadingSpinner iconClassName="h-3 w-3" label="疑問リンクを作成中" /> : <Plus className="h-3 w-3" />}
                    <span className="truncate">{term}</span>
                  </button>
                )) : <span className="text-xs text-[#9a9690]">候補語句がありません。</span>}
              </div>
              <div className="flex gap-1.5">
                <input value={customTerm} onChange={(event) => setCustomTerm(event.target.value)} onKeyDown={(event) => {
                  if (event.key === "Enter") handleCreateCustomQuestion(); }} placeholder="語句を入力して疑問にする" className="h-8 min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-2.5 text-xs text-[#343434] outline-none transition placeholder:text-[#aaa49d] focus:border-[#c8c6bf]" maxLength={MAX_CUSTOM_TERM_LENGTH}
                />
                <button type="button" className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-stone-300 bg-[#f7f6f2] px-2.5 text-xs font-semibold text-[#5f5f5f] transition hover:bg-slate-100 disabled:opacity-60" onClick={handleCreateCustomQuestion} disabled={!sanitizeCustomTerm(customTerm) || creatingTerm !== null}>追加</button>
              </div>
            </div>
            <div className="mt-3 border-t border-[#eceae4] pt-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-[#9a9690]">つながっている疑問</p>
              {snapshot.linkedCards.length > 0 ? (
                <div className="flex max-h-28 flex-col gap-1 overflow-y-auto pr-1">
                  {snapshot.linkedCards.map((linkedCard) => (
                    <button key={linkedCard.id} type="button" className={cn("flex min-h-8 items-center rounded-lg px-2 text-left text-xs text-[#4b4b4b] transition hover:bg-[#f7f6f2]", linkedCard.id === selectedCardId && "bg-[#f7f6f2]")} onClick={() => handleOpenLinkedCard(linkedCard)}>
                      <span className="min-w-0 truncate">{getCardTitle(linkedCard)}</span>
                    </button>
                  ))}
                </div>
              ) : <p className="text-xs leading-relaxed text-[#9a9690]">まだリンクはありません。回答内の語句から疑問を作ると、ここに表示されます。</p>}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};



const CardQuestionLinksPanel = memo(CardQuestionLinksPanelComponent);
CardQuestionLinksPanel.displayName = "CardQuestionLinksPanel";

export { CardQuestionLinksPanel };


export type { CardQuestionLinksPanelProps };
