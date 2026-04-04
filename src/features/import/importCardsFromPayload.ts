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

type ImportCardsFromPayloadParams = {
  payload: ImportPayload;
  folderId: string;
  fileName: string;
  createCardSet: CreateCardSet;
  createCard: CreateCard;
};

const buildImportCardSetName = (fileName: string) => {
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
}: ImportCardsFromPayloadParams) => {
  const createdCardSet = await createCardSet(
    buildImportCardSetName(fileName),
    folderId,
  );

  let createdCount = 0;

  for (const importCard of payload.cards) {
    const frontBlocks = importCard.blocks.map(mapImportBlockToCardBlock);

    await createCard({
      folderId,
      cardSetId: createdCardSet.id,
      title: importCard.title?.trim() || "",
      front: {
        blocks: frontBlocks,
      },
      back: {
        blocks: [],
      },
      isDraft: false,
      isCompleted: false,
      isSilent: false,
      hasUncertainty: false,
    });

    createdCount += 1;
  }

  return {
    createdCardSetId: createdCardSet.id,
    createdCount,
  };
};
