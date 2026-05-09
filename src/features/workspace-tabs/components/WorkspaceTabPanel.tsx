import type { ComponentProps } from "react";
import { useMemo } from "react";
import { CardPane } from "@/components/folder/panes/CardPane";
import { PdfPane } from "@/features/pdf/PdfPane";
import { PdfWorkspaceProvider } from "@/features/pdf/PdfWorkspaceProvider";
import { resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import {
  WorkspaceHeaderToolbar,
  type WorkspaceHeaderToolbarIconProps,
} from "@/features/workspace/components/WorkspaceHeaderToolbar";
import { useDocumentCommands } from "@/hooks/platform/useDocumentCommands";
import { cn } from "@/lib/utils";
import { Filter, Search } from "@/ui/icons";
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

const ThumbnailToolbarIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      d="M2 12C2 7.757 2 5.636 3.464 4.318C4.93 3 7.286 3 12 3C16.714 3 19.071 3 20.535 4.318C21.999 5.636 22 7.758 22 12C22 16.242 22 18.364 20.535 19.682C19.072 21 16.714 21 12 21C7.286 21 4.929 21 3.464 19.682C1.999 18.364 2 16.242 2 12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 16H10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 8H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 12H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 16H18"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.4 8H7.6C6.846 8 6.469 8 6.234 8.234C6 8.47 6 8.846 6 9.6V10.4C6 11.154 6 11.531 6.234 11.766C6.47 12 6.846 12 7.6 12H8.4C9.154 12 9.531 12 9.766 11.766C10 11.53 10 11.154 10 10.4V9.6C10 8.846 10 8.469 9.766 8.234C9.53 8 9.154 8 8.4 8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SortToolbarIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M11.9337 5.49595L8.00095 2.125L4.06817 5.49595C3.78932 5.73497 3.75703 6.15478 3.99604 6.43363C4.23506 6.71248 4.65487 6.74478 4.93373 6.50576L8.00095 3.87671L11.0682 6.50576C11.347 6.74478 11.7668 6.71248 12.0059 6.43363C12.2449 6.15478 12.2126 5.73497 11.9337 5.49595ZM4.06823 10.506L8.001 13.877L11.9338 10.506C12.2126 10.267 12.2449 9.84717 12.0059 9.56832C11.7669 9.28947 11.3471 9.25717 11.0682 9.49619L8.001 12.1252L4.93378 9.49619C4.65493 9.25717 4.23511 9.28947 3.9961 9.56832C3.75708 9.84717 3.78938 10.267 4.06823 10.506Z"
      fill="#8F929C"
    />
  </svg>
);

const FieldsToolbarIcon = ({
  className,
  ...props
}: WorkspaceHeaderToolbarIconProps) => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
    {...props}
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.00094 3.33594C1.63367 3.33594 1.33594 3.63367 1.33594 4.00094C1.33594 4.36821 1.63367 4.66594 2.00094 4.66594H2.0076C2.37487 4.66594 2.6726 4.36821 2.6726 4.00094C2.6726 3.63367 2.37487 3.33594 2.0076 3.33594H2.00094ZM5.33443 3.33594C4.96716 3.33594 4.66943 3.63367 4.66943 4.00094C4.66943 4.36821 4.96716 4.66594 5.33443 4.66594H14.0011C14.3684 4.66594 14.6661 4.36821 14.6661 4.00094C14.6661 3.63367 14.3684 3.33594 14.0011 3.33594H5.33443ZM5.33443 7.33594C4.96716 7.33594 4.66943 7.63367 4.66943 8.00094C4.66943 8.36821 4.96716 8.66594 5.33443 8.66594H14.0011C14.3684 8.66594 14.6661 8.36821 14.6661 8.00094C14.6661 7.63367 14.3684 7.33594 14.0011 7.33594H5.33443ZM4.66943 12.0009C4.66943 11.6337 4.96716 11.3359 5.33443 11.3359H14.0011C14.3684 11.3359 14.6661 11.6337 14.6661 12.0009C14.6661 12.3682 14.3684 12.6659 14.0011 12.6659H5.33443C4.96716 12.6659 4.66943 12.3682 4.66943 12.0009ZM1.33594 8.00094C1.33594 7.63367 1.63367 7.33594 2.00094 7.33594H2.0076C2.37487 7.33594 2.6726 7.63367 2.6726 8.00094C2.6726 8.36821 2.37487 8.66594 2.0076 8.66594H2.00094C1.63367 8.66594 1.33594 8.36821 1.33594 8.00094ZM2.00094 11.3359C1.63367 11.3359 1.33594 11.6337 1.33594 12.0009C1.33594 12.3682 1.63367 12.6659 2.00094 12.6659H2.0076C2.37487 12.6659 2.6726 12.3682 2.6726 12.0009C2.6726 11.6337 2.37487 11.3359 2.0076 11.3359H2.00094Z"
      fill="#74798B"
    />
  </svg>
);

const PDF_DOCUMENT_TOOLBAR_LEADING_ACTIONS = [
  {
    label: "Thumbnails",
    ariaLabel: "サムネイル",
    icon: ThumbnailToolbarIcon,
    onClick: () => undefined,
  },
] as const;

const PDF_DOCUMENT_TOOLBAR_ACTIONS = [
  { label: "Search", icon: Search, onClick: () => undefined },
  { label: "Filter", icon: Filter, onClick: () => undefined },
  { label: "Sort", icon: SortToolbarIcon, onClick: () => undefined },
  { label: "Fields", icon: FieldsToolbarIcon, onClick: () => undefined },
] as const;

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
          <WorkspaceHeaderToolbar
            activeValue=""
            tabs={[]}
            leadingActions={PDF_DOCUMENT_TOOLBAR_LEADING_ACTIONS}
            actions={PDF_DOCUMENT_TOOLBAR_ACTIONS}
          />

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
