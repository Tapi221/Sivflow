import type { ComponentProps } from "react";
import { useMemo } from "react";
import { CardPane } from "@/components/folder/panes/CardPane";
import { PdfPane } from "@/components/pdf/PdfPane";
import { PdfWorkspaceProvider } from "@/components/pdf/PdfWorkspaceProvider";
import { resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { CalendarWorkspaceToolbar } from "@/features/calendar/ui/ExplorerCalendarPane";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { cn } from "@/lib/utils";
import type { Card, CardSet, DocumentItem } from "@/types";
import type { WorkspaceEntityTab } from "@/features/workspace-tabs/domain/workspaceTab";
import {
  resolveCardSetTabTitle,
  resolveCardTabTitle,
} from "@/features/workspace-tabs/lib/resolveWorkspaceTabTitle";
import { useWorkspaceTabsStore } from "@/features/workspace-tabs/store/useWorkspaceTabsStore";

type PdfPaneUpdateHandler = NonNullable<
  ComponentProps<typeof PdfPane>["onDocumentUpdate"]
>;
type PdfPaneUpdates = Parameters<PdfPaneUpdateHandler>[0];

type WorkspaceTabPanelProps = {
  activeTab: WorkspaceEntityTab;
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  cardsLoading: boolean;
  cardSetsLoading: boolean;
  documentsLoading: boolean;
  onCardUpdated: () => void;
};

type WorkspacePanelStatusProps = {
  title: string;
  description?: string;
};

const WorkspacePanelStatus = ({
  title,
  description,
}: WorkspacePanelStatusProps) => {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#fbfbfa] p-6">
      <div className="max-w-md rounded-xl border border-[#e2e1dc] bg-white px-5 py-4 text-sm shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="text-[14px] font-semibold text-[#2f2e2a]">{title}</div>
        {description ? (
          <div className="mt-2 leading-6 text-[#777671]">{description}</div>
        ) : null}
      </div>
    </div>
  );
};

const buildMapById = <TEntity extends { id: string }>(entities: TEntity[]) => {
  return new Map(entities.map((entity) => [entity.id, entity]));
};

export const WorkspaceTabPanel = ({
  activeTab,
  cards,
  cardSets,
  documents,
  cardsLoading,
  cardSetsLoading,
  documentsLoading,
  onCardUpdated,
}: WorkspaceTabPanelProps) => {
  const { updateDocument } = useDocumentCommands();
  const openCardTab = useWorkspaceTabsStore((state) => state.openCardTab);

  const documentById = useMemo(() => buildMapById(documents), [documents]);
  const cardById = useMemo(() => buildMapById(cards), [cards]);
  const cardSetById = useMemo(() => buildMapById(cardSets), [cardSets]);

  if (activeTab.kind === "document") {
    const document = documentById.get(activeTab.documentId);

    if (!document) {
      return documentsLoading ? (
        <WorkspacePanelStatus title="PDF を読み込んでいます" />
      ) : (
        <WorkspacePanelStatus
          title="PDF が見つかりません"
          description="タブに対応するPDFが削除されたか、同期がまだ完了していません。"
        />
      );
    }

    if (document.kind !== "pdf") {
      return (
        <WorkspacePanelStatus
          title="この文書形式は表示できません"
          description="現在のワークスペースタブは PDF 表示に対応しています。"
        />
      );
    }

    const handleDocumentUpdate = async (updates: PdfPaneUpdates) => {
      await updateDocument(document.id, updates as Partial<DocumentItem>);
    };

    return (
      <PdfWorkspaceProvider
        key={document.id}
        doc={document}
        onDocumentUpdate={handleDocumentUpdate}
      >
        <div className="relative flex h-full min-h-0 w-full flex-col bg-white">
          <div className="[&>div]:!justify-end [&>div>div:first-child]:hidden">
            <CalendarWorkspaceToolbar
              activeMode="calendar"
              onSelectCalendar={() => undefined}
              onSelectTimeline={() => undefined}
            />
          </div>

          <PdfPane
            doc={document}
            className="min-h-0 flex-1"
            onDocumentUpdate={handleDocumentUpdate}
          />
        </div>
      </PdfWorkspaceProvider>
    );
  }

  if (activeTab.kind === "card") {
    const card = cardById.get(activeTab.cardId);

    if (!card) {
      return cardsLoading ? (
        <WorkspacePanelStatus title="カードを読み込んでいます" />
      ) : (
        <WorkspacePanelStatus
          title="カードが見つかりません"
          description="タブに対応するカードが削除されたか、同期がまだ完了していません。"
        />
      );
    }

    return <CardPane selectedCardId={card.id} onCardUpdated={onCardUpdated} />;
  }

  if (activeTab.kind === "cardSet") {
    const cardSet = cardSetById.get(activeTab.cardSetId);

    if (!cardSet) {
      return cardSetsLoading ? (
        <WorkspacePanelStatus title="カードセットを読み込んでいます" />
      ) : (
        <WorkspacePanelStatus
          title="カードセットが見つかりません"
          description="タブに対応するカードセットが削除されたか、同期がまだ完了していません。"
        />
      );
    }

    const cardSetCards = cards.filter((card) => card.cardSetId === cardSet.id);

    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#fbfbfa]">
        <div className="shrink-0 border-b border-[#e5e4df] bg-white px-5 py-4">
          <div className="text-[13px] text-[#8b8a84]">カードセット</div>
          <div className="mt-1 text-[20px] font-semibold text-[#2f2e2a]">
            {resolveCardSetTabTitle(cardSet)}
          </div>
          <div className="mt-1 text-[12px] text-[#8b8a84]">
            {cardSetCards.length} 件のカード
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {cardSetCards.length > 0 ? (
            <div className="mx-auto flex max-w-3xl flex-col gap-2">
              {cardSetCards.map((card, index) => {
                const title = resolveCardTabTitle(card);
                return (
                  <button
                    key={card.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border border-[#e5e4df] bg-white px-4 py-3 text-left",
                      "shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition-colors hover:bg-[#f7f6f2]",
                    )}
                    onClick={() => {
                      openCardTab({
                        cardId: card.id,
                        title,
                        folderId: resolveCardFolderId(card, cardSetById),
                      });
                    }}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0efea] text-[12px] text-[#777671]">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#2f2e2a]">
                      {title}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <WorkspacePanelStatus
              title="カードがありません"
              description="このカードセットにはまだ表示できるカードがありません。"
            />
          )}
        </div>
      </div>
    );
  }

  return null;
};
