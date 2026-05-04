import type { ComponentProps } from "react";
import { useMemo } from "react";

import { CardPane } from "@/components/folder/panes/CardPane";
import { resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import { PdfPane } from "@/components/pdf/PdfPane";
import { PdfWorkspaceProvider } from "@/components/pdf/PdfWorkspaceProvider";
import { PdfViewerTopLeftButton } from "@/components/pdf/PdfViewerTopLeftButton";
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
          <div className="relative">
            <div className="[&>div]:!justify-end [&>div>div:first-child]:hidden">
              <CalendarWorkspaceToolbar
                activeMode="calendar"
                onSelectCalendar={() => undefined}
                onSelectTimeline={() => undefined}
              />
            </div>

            <div className="pointer-events-none absolute left-4 top-full z-30 translate-y-0">
              <div className="pointer-events-auto">
                <PdfViewerTopLeftButton />
              </div>
            </div>
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
        <WorkspacePanelStatus title="カードが見つかりません" />
      );
    }

    return (
      <CardPane
        card={card}
        cards={cards}
        cardSets={cardSets}
        onCardUpdated={onCardUpdated}
        onOpenCard={openCardTab}
      />
    );
  }

  if (activeTab.kind === "cardSet") {
    const cardSet = cardSetById.get(activeTab.cardSetId);
    if (!cardSet) {
      return cardSetsLoading ? (
        <WorkspacePanelStatus title="カードセットを読み込んでいます" />
      ) : (
        <WorkspacePanelStatus title="カードセットが見つかりません" />
      );
    }

    return (
      <CardPane
        card={null}
        cards={cards.filter(
          (card) => resolveCardFolderId(card) === activeTab.cardSetId,
        )}
        cardSets={cardSets}
        onCardUpdated={onCardUpdated}
        onOpenCard={openCardTab}
        initialCardSet={cardSet}
      />
    );
  }

  return <WorkspacePanelStatus title="表示できる内容がありません" />;
};