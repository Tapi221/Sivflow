import type { ComponentProps } from "react";
import { useMemo } from "react";

import { CardPane } from "@/components/folder/panes/CardPane";
import { PdfPane } from "@/features/pdf/PdfPane";
import { PdfWorkspaceProvider } from "@/features/pdf/PdfWorkspaceProvider";
import type { WorkspaceEntityTab } from "@/features/tab/Tab";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import type { Card, DocumentItem } from "@/types";

type PdfPaneUpdateHandler = NonNullable<ComponentProps<typeof PdfPane>["onDocumentUpdate"]>;
type PdfPaneUpdates = Parameters<PdfPaneUpdateHandler>[0];

type WorkspaceTabPanelProps = {
  activeTab: WorkspaceEntityTab;
  cards: Card[];
  documents: DocumentItem[];
  cardsLoading: boolean;
  documentsLoading: boolean;
  onCardUpdated: () => void;
};

const buildMapById = <TEntity extends { id: string }>(entities: TEntity[]) => {
  return new Map(entities.map((entity) => [entity.id, entity]));
};

const WorkspacePanelStatus = ({ title }: { title: string }) => {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#fbfbfa] p-6">
      <div className="rounded-xl border border-[#e2e1dc] bg-white px-5 py-4 text-sm text-[#2f2e2a] shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        {title}
      </div>
    </div>
  );
};

export const WorkspaceTabPanel = ({
  activeTab,
  cards,
  documents,
  cardsLoading,
  documentsLoading,
  onCardUpdated,
}: WorkspaceTabPanelProps) => {
  const { updateDocument } = useDocumentCommands();
  const documentById = useMemo(() => buildMapById(documents), [documents]);
  const cardById = useMemo(() => buildMapById(cards), [cards]);

  if (activeTab.kind === "document") {
    const document = documentById.get(activeTab.documentId);

    if (!document) {
      return <WorkspacePanelStatus title={documentsLoading ? "PDF を読み込んでいます" : "PDF が見つかりません"} />;
    }

    if (document.kind !== "pdf") {
      return <WorkspacePanelStatus title="この文書形式は表示できません" />;
    }

    const handleDocumentUpdate = async (updates: PdfPaneUpdates) => {
      await updateDocument(document.id, updates as Partial<DocumentItem>);
    };

    return (
      <PdfWorkspaceProvider key={document.id} doc={document} onDocumentUpdate={handleDocumentUpdate}>
        <div className="relative h-full min-h-0 w-full overflow-hidden bg-white">
          <PdfPane doc={document} className="h-full min-h-0" onDocumentUpdate={handleDocumentUpdate} />
        </div>
      </PdfWorkspaceProvider>
    );
  }

  if (activeTab.kind === "card") {
    const card = cardById.get(activeTab.cardId);

    if (!card) {
      return <WorkspacePanelStatus title={cardsLoading ? "カードを読み込んでいます" : "カードが見つかりません"} />;
    }

    return <CardPane selectedCardId={card.id} onCardUpdated={onCardUpdated} />;
  }

  return null;
};
