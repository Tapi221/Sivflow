import { buildCardSetById, resolveCardFolderId } from "@/domain/card/selectors/cardFolder";
import type { SearchItem } from "@/features/search/model/search.types";
import type { Card, CardSet, DocumentItem, Folder, SelectedExplorerItem } from "@/types";



type BuildExplorerSearchItemsParams = {
  folders: Folder[];
  cards: Card[];
  cardSets: CardSet[];
  documents: DocumentItem[];
  onFolderSelect: (folderId: string | null) => void;
  onItemSelect: (item: SelectedExplorerItem) => void;
};



const normalizeLabel = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
};
const uniqueKeywords = (...values: Array<string | null | undefined>) => {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (value ? [value] : []))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
};
const buildExplorerSearchItems = ({ folders, cards, cardSets, documents, onFolderSelect, onItemSelect }: BuildExplorerSearchItemsParams) => {
  const activeFolders = folders.filter((folder) => !folder.isDeleted && !folder.isHidden);
  const activeCardSets = cardSets.filter((cardSet) => !cardSet.isDeleted);
  const activeCards = cards.filter((card) => !card.isDeleted);
  const activeDocuments = documents.filter(
    (document) => document.kind === "pdf" && !document.isDeleted,
  );

  const folderById = new Map(
    activeFolders.map((folder) => [folder.id, folder]),
  );
  const cardSetById = buildCardSetById(activeCardSets);
  const folderPathCache = new Map<string, string>();

  const getFolderPath = (folderId: string | null | undefined): string => {
    if (!folderId) {
      return "";
    }

    const cached = folderPathCache.get(folderId);
    if (cached !== undefined) {
      return cached;
    }

    const folder = folderById.get(folderId);
    if (!folder) {
      return "";
    }

    const parentPath = getFolderPath(folder.parentFolderId ?? null);
    const currentLabel = normalizeLabel(folder.folderName, "無題のフォルダ");
    const nextPath = parentPath
      ? `${parentPath} / ${currentLabel}`
      : currentLabel;
    folderPathCache.set(folderId, nextPath);
    return nextPath;
  };

  const folderItems: SearchItem[] = activeFolders.map((folder) => {
    const folderTitle = normalizeLabel(folder.folderName, "無題のフォルダ");
    const parentPath = getFolderPath(folder.parentFolderId ?? null);

    return {
      id: `folder:${folder.id}`,
      value: `folder:${folder.id}`,
      kind: "folder",
      iconKind: "folder",
      title: folderTitle,
      subtitle: parentPath || undefined,
      keywords: uniqueKeywords(
        folderTitle,
        parentPath,
        getFolderPath(folder.id),
        "フォルダ",
        "folder",
      ),
      timestampValue: folder.updatedAt,
      onSelect: () => {
        onFolderSelect(folder.id);
      },
    };
  });

  const cardSetItems: SearchItem[] = activeCardSets.map((cardSet) => {
    const cardSetTitle = normalizeLabel(cardSet.name, "無題のセット");
    const folderPath = getFolderPath(cardSet.folderId);

    return {
      id: `cardSet:${cardSet.id}`,
      value: `cardSet:${cardSet.id}`,
      kind: "cardSet",
      iconKind: "cardSet",
      title: cardSetTitle,
      subtitle: folderPath || undefined,
      keywords: uniqueKeywords(
        cardSetTitle,
        folderPath,
        "カードセット",
        "card set",
        "set",
      ),
      timestampValue: cardSet.updatedAt,
      onSelect: () => {
        onItemSelect({ type: "cardSet", id: cardSet.id });
      },
    };
  });

  const cardItems: SearchItem[] = activeCards.map((card) => {
    const linkedCardSet = cardSetById.get(card.cardSetId);
    const cardSetTitle = linkedCardSet
      ? normalizeLabel(linkedCardSet.name, "無題のセット")
      : "";
    const resolvedFolderId = resolveCardFolderId(card, cardSetById);
    const folderPath = getFolderPath(resolvedFolderId);
    const cardTitle = normalizeLabel(
      card.title,
      normalizeLabel(card.questionNumber, "無題のカード"),
    );

    return {
      id: `card:${card.id}`,
      value: `card:${card.id}`,
      kind: "card",
      iconKind: "card",
      title: cardTitle,
      subtitle: cardSetTitle || folderPath || undefined,
      keywords: uniqueKeywords(
        cardTitle,
        card.questionNumber,
        cardSetTitle,
        folderPath,
        "カード",
        "card",
      ),
      timestampValue: card.updatedAt,
      onSelect: () => {
        onItemSelect({ type: "card", id: card.id });
      },
    };
  });

  const documentItems: SearchItem[] = activeDocuments.map((document) => {
    const documentTitle = normalizeLabel(document.title, "無題の文書");
    const folderPath = getFolderPath(document.folderId);

    return {
      id: `document:${document.id}`,
      value: `document:${document.id}`,
      kind: "document",
      iconKind: "document",
      title: documentTitle,
      subtitle: folderPath || undefined,
      keywords: uniqueKeywords(
        documentTitle,
        document.fileName,
        folderPath,
        "文書",
        "document",
        "pdf",
      ),
      timestampValue: document.updatedAt,
      onSelect: () => {
        onItemSelect({ type: "document", id: document.id });
      },
    };
  });

  return [...folderItems, ...cardSetItems, ...cardItems, ...documentItems];
};



export { buildExplorerSearchItems };
