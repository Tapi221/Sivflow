import { normalizeInkDocument } from "@core/domain/card/ink/inkDocument";
import { restoreMfDeckMediaInBlocks } from "./mfDeckMediaRestorer";
import type { MfDeckArchiveV1, MfDeckCardV1, MfDeckIssue } from "@/features/deckFile/domain/mfDeck.types";
import type { Card, CardBlock, CardSet } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type CreateMfDeckCardSet = (name: string, targetFolderId?: string | null, opts?: { description?: string;
  id?: string;
  orderIndex?: number;
},
) => Promise<CardSet>;
type UpdateMfDeckCardSet = (id: string, data: Partial<Pick<CardSet, "name" | "description" | "orderIndex" | "defaultDisplayMode">>) => Promise<void>;
type CreateMfDeckCard = (cardData: Partial<Card> & { cardSetId?: string; }) => Promise<Card>;
type EnsureMfDeckTagByName = (name: string) => Promise<string | null>;
type MfDeckImportDestination = | { kind: "new-card-set";
  cardSetName?: string;
}
  | {
    kind: "existing-card-set";
    cardSetId: string;
    cardSetName: string;
  };
type ImportMfDeckArchiveParams = {
  archive: MfDeckArchiveV1;
  folderId: string;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
  destination: MfDeckImportDestination;
};
type ImportMfDeckArchiveResult = {
  createdCardSetId: string;
  createdCardSetName: string;
  folderId: string;
  createdCount: number;
  issues: MfDeckIssue[];
};



const cloneJson = <T>(value: T): T => {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
};
const genId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};
const cloneBlocksWithFreshIds = (blocks: CardBlock[]): CardBlock[] => {
  const idMap = new Map<string, string>();

  blocks.forEach((block) => {
    idMap.set(block.id, genId());
  });

  return blocks.map((block) => {
    const nextBlock = cloneJson(block) as CardBlock;
    const nextId = idMap.get(block.id) ?? genId();

    nextBlock.id = nextId;

    if (typeof block.parentBlockId === "string") {
      nextBlock.parentBlockId = idMap.get(block.parentBlockId) ?? null;
    }

    return nextBlock;
  });
};
const resolveCardTagIds = async ({
  card,
  ensureTagByName,
  issues,
}: {
  card: MfDeckCardV1;
  ensureTagByName?: EnsureMfDeckTagByName;
  issues: MfDeckIssue[];
}): Promise<string[]> => {
  if (!ensureTagByName || !Array.isArray(card.tagNames)) {
    return [];
  }

  const tagIds: string[] = [];

  for (const tagName of card.tagNames) {
    const trimmed = tagName.trim();
    if (!trimmed) continue;

    try {
      const tagId = await ensureTagByName(trimmed);
      if (tagId) tagIds.push(tagId);
    } catch {
      issues.push({
        level: "warning",
        code: "unexpected_value",
        cardId: card.id,
        message: `タグ「${trimmed}」を作成できなかったため、このタグはスキップしました。`,
      });
    }
  }

  return Array.from(new Set(tagIds));
};
const normalizeDisplayModePatch = (
  value: CardDisplayMode | undefined,
): Pick<CardSet, "defaultDisplayMode"> | Record<string, never> => {
  if (value !== "fixed" && value !== "fluid") return {};
  return { defaultDisplayMode: value };
};
const normalizeMfDeckInk = (value: unknown): Card["front"]["ink"] => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = normalizeInkDocument(value);

  if (normalized.strokes.length === 0) {
    return null;
  }

  return normalized;
};
const buildCardInput = async ({
  card,
  folderId,
  cardSetId,
  orderIndex,
  ensureTagByName,
  issues,
  mediaContext,
}: {
  card: MfDeckCardV1;
  folderId: string;
  cardSetId: string;
  orderIndex: number;
  ensureTagByName?: EnsureMfDeckTagByName;
  issues: MfDeckIssue[];
  mediaContext: Pick<MfDeckArchiveV1, "media" | "mediaManifest">;
}): Promise<Partial<Card> & { cardSetId: string; }> => {
  const tagIds = await resolveCardTagIds({ card, ensureTagByName, issues });

  return {
    folderId,
    cardSetId,
    orderIndex,
    questionNumber: card.questionNumber?.trim() || undefined,
    title: card.title?.trim() ?? "",
    front: {
      blocks: restoreMfDeckMediaInBlocks({
        blocks: cloneBlocksWithFreshIds(card.front.blocks),
        media: mediaContext.media,
        mediaManifest: mediaContext.mediaManifest,
        issues,
        cardId: card.id,
      }),
      ink: normalizeMfDeckInk(card.front.ink),
      extraRows: card.front.extraRows ?? 0,
    },
    back: {
      blocks: restoreMfDeckMediaInBlocks({
        blocks: cloneBlocksWithFreshIds(card.back.blocks),
        media: mediaContext.media,
        mediaManifest: mediaContext.mediaManifest,
        issues,
        cardId: card.id,
      }),
      ink: normalizeMfDeckInk(card.back.ink),
      extraRows: card.back.extraRows ?? 0,
    },
    layoutRows: cloneJson(card.layoutRows ?? undefined) as Card["layoutRows"],
    ...(tagIds.length > 0 ? { tagIds } : {}),
    isDraft: card.flags?.isDraft ?? false,
    isCompleted: false,
    isSilent: card.flags?.isSilent ?? false,
    hasUncertainty: false,
    isBookmarked: false,
  };
};
const importMfDeckArchive = async ({ archive, folderId, createCardSet, updateCardSet, createCard, ensureTagByName, destination }: ImportMfDeckArchiveParams): Promise<ImportMfDeckArchiveResult> => {
  const issues: MfDeckIssue[] = [];
  const manifestDeck = archive.manifest.deck;

  const targetCardSet =
    destination.kind === "existing-card-set"
      ? {
        id: destination.cardSetId,
        name: destination.cardSetName,
      }
      : await createCardSet(
        destination.cardSetName?.trim() || manifestDeck.name,
        folderId,
        {
          description: manifestDeck.description,
        },
      );

  if (destination.kind === "new-card-set" && updateCardSet) {
    const displayModePatch = normalizeDisplayModePatch(
      manifestDeck.defaultDisplayMode,
    );

    if (Object.keys(displayModePatch).length > 0) {
      await updateCardSet(targetCardSet.id, displayModePatch);
    }
  }

  const baseOrderIndex = Date.now() * 1000;
  let createdCount = 0;

  for (const [index, card] of archive.cardsJson.cards.entries()) {
    const cardInput = await buildCardInput({
      card,
      folderId,
      cardSetId: targetCardSet.id,
      orderIndex: baseOrderIndex + index,
      ensureTagByName,
      issues,
      mediaContext: {
        media: archive.media,
        mediaManifest: archive.mediaManifest,
      },
    });

    await createCard(cardInput);
    createdCount += 1;
  }

  return {
    createdCardSetId: targetCardSet.id,
    createdCardSetName: targetCardSet.name || manifestDeck.name,
    folderId,
    createdCount,
    issues,
  };
};



export { importMfDeckArchive };


export type { CreateMfDeckCardSet, UpdateMfDeckCardSet, CreateMfDeckCard, EnsureMfDeckTagByName, MfDeckImportDestination, ImportMfDeckArchiveParams, ImportMfDeckArchiveResult };
