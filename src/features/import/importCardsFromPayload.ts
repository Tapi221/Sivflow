import type { ImportBlock, ImportPayload } from "@/features/import/types";
import type { Card, CardBlock, CardSet } from "@/types";

type CreateCardSet = (
  name: string,
  targetFolderId?: string | null,
  opts?: {
    description?: string;
    id?: string;
    orderIndex?: number;
  },
) => Promise<CardSet>;

type CreateCard = (
  cardData: Partial<Card> & { cardSetId?: string },
) => Promise<Card>;

/**
 * 取り込み先の指定。新規作成か既存セットへの追加
 */
export type ImportDestination =
  | {
      kind: "new-card-set";
      cardSetName?: string;
    }
  | {
      kind: "existing-card-set";
      cardSetId: string;
      cardSetName: string;
    };

type ImportCardsFromPayloadParams = {
  payload: ImportPayload;
  folderId: string;
  fileName: string;
  createCardSet: CreateCardSet;
  createCard: CreateCard;
  destination: ImportDestination;
};

export const buildImportCardSetName = (fileName: string) => {
  const baseName = fileName.replace(/\.xlsx$/i, "").trim();
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  if (!baseName) {
    return `一括インポート ${dateLabel}`;
  }

  return `${baseName} ${dateLabel}`;
};

const mapImportBlockToCardBlock = (block: ImportBlock): CardBlock => {
  const baseBlock = {
    id: crypto.randomUUID(),
    orderIndex: block.order,
  };

  if (block.type === "text") {
    return {
      ...baseBlock,
      type: "text",
      content: block.content ?? "",
    } as CardBlock;
  }

  if (block.type === "markdown") {
    return {
      ...baseBlock,
      type: "markdown",
      markdown: block.content ?? "",
    } as CardBlock;
  }

  if (block.type === "math") {
    return {
      ...baseBlock,
      type: "math",
      math: {
        latex: block.content ?? "",
        displayMode: "block",
      },
    } as CardBlock;
  }

  if (block.type === "code") {
    return {
      ...baseBlock,
      type: "code",
      code: {
        language: block.language?.trim() || "plaintext",
        code: block.content ?? "",
      },
    } as CardBlock;
  }

  throw new Error(`Unsupported import block type: ${block.type}`);
};

export const importCardsFromPayload = async ({
  payload,
  folderId,
  fileName,
  createCardSet,
  createCard,
  destination,
}: ImportCardsFromPayloadParams) => {
  // 転送先カードセットの特定（新規作成 または 既存）
  const resolvedDestination =
    destination.kind === "existing-card-set"
      ? {
          id: destination.cardSetId,
          name: destination.cardSetName,
        }
      : await createCardSet(
          destination.cardSetName?.trim() || buildImportCardSetName(fileName),
          folderId,
        );

  let createdCount = 0;

  // 既存のカードの後ろに追加されるよう、ベースの orderIndex を作成する
  const baseOrderIndex = Date.now() * 10000;

  for (const [index, importCard] of payload.cards.entries()) {
    const frontBlocks = importCard.blocks.map(mapImportBlockToCardBlock);

    await createCard({
      folderId,
      cardSetId: resolvedDestination.id,
      orderIndex: baseOrderIndex + index,
      title: importCard.title?.trim() || "",
      front: {
        blocks: frontBlocks,
      },
      back: {
        blocks: [],
      },
      layoutRows: {
        top: 4,
        bottom: 4,
        left: 0,
        right: 0,
      },
      frontRows: 0,
      backRows: 0,
      tags: [],
      isDraft: false,
      isCompleted: false,
      isSilent: false,
      hasUncertainty: false,
    });

    createdCount += 1;
  }

  return {
    createdCardSetId: resolvedDestination.id,
    createdCardSetName: resolvedDestination.name || "",
    folderId,
    createdCount,
  };
};
