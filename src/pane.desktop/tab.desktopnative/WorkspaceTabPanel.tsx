import { useCallback, useMemo } from "react";
import { CardPane } from "@/components/folder/panes/CardPane";
import { useDocumentCommands } from "@/features/document/hooks/useDocumentCommands";
import { PdfDocumentPane } from "@/features/pdf/PdfDocumentPane";
import type { WorkspaceEntityTab } from "./Tab";
import type { Card, DocumentItem } from "@/types";



type WorkspaceTabPanelProps = {
  activeTab: WorkspaceEntityTab;
  cards: Card[];
  documents: DocumentItem[];
  cardsLoading: boolean;
  documentsLoading: boolean;
  onCardUpdated: () => void;
};



const workspaceTabPanelTextClassName = "text-lg leading-6";



const buildMapById = <TEntity extends { id: string; },>(entities: TEntity[]) => {
  return new Map(entities.map((entity) => [entity.id, entity]));
};



const WorkspacePanelStatus = ({ title }: { title: string; }) => {
  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center bg-[#fbfbfa] p-6">
      <div className={`rounded-xl border border-[#e2e1dc] bg-white px-5 py-4 ${workspaceTabPanelTextClassName} text-[#2f2e2a] shadow-[0_12px_28px_rgba(15,23,42,0.06)]`}>
        {title}
      </div>
    </div>
  );
};
const WorkspaceTabPanel = ({
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
  const handleDocumentUpdate = useCallback(async (documentId: string, updates: Partial<DocumentItem>) => {
    await updateDocument(documentId, updates);
  }, [updateDocument]);

  if (activeTab.kind === "document") {
    const document = documentById.get(activeTab.documentId);

    if (!document) {
      return <WorkspacePanelStatus title={documentsLoading ? "PDF を読み込んでいます" : "PDF が見つかりません"} />;
    }

    if (document.kind !== "pdf") {
      return <WorkspacePanelStatus title="この文書形式は表示できません" />;
    }

    return (
      <div className={`relative h-full min-h-0 w-full overflow-hidden bg-white ${workspaceTabPanelTextClassName}`}>
        <PdfDocumentPane document={document} className="h-full min-h-0" onDocumentUpdate={(updates) => handleDocumentUpdate(document.id, updates)} />
      </div>
    );
  }

  if (activeTab.kind === "card") {
    const card = cardById.get(activeTab.cardId);

    if (!card) {
      return <WorkspacePanelStatus title={cardsLoading ? "カードを読み込んでいます" : "カードが見つかりません"} />;
    }

    return (
      <div className={`h-full min-h-0 w-full ${workspaceTabPanelTextClassName}`}>
        <CardPane selectedCardId={card.id} onCardUpdated={onCardUpdated} />
      </div>
    );
  }

  return null;
};



export { WorkspaceTabPanel };
