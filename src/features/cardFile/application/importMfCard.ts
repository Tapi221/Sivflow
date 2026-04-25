import {
  importMfDeckArchive,
  type CreateMfDeckCard,
  type CreateMfDeckCardSet,
  type EnsureMfDeckTagByName,
  type ImportMfDeckArchiveResult,
  type MfDeckImportDestination,
  type UpdateMfDeckCardSet,
} from "@/features/deckFile/application/importMfDeck";
import {
  MF_DECK_FORMAT,
  MF_DECK_VERSION,
  type MfDeckArchiveV1,
} from "@/features/deckFile/domain/mfDeckTypes";
import type { MfCardFileV1 } from "@/features/cardFile/domain/mfCardTypes";

export type ImportMfCardFileParams = {
  cardFile: MfCardFileV1;
  folderId: string;
  createCardSet: CreateMfDeckCardSet;
  updateCardSet?: UpdateMfDeckCardSet;
  createCard: CreateMfDeckCard;
  ensureTagByName?: EnsureMfDeckTagByName;
  destination: MfDeckImportDestination;
};

const resolveCardSetName = (cardFile: MfCardFileV1) => {
  const title = cardFile.card.title?.trim();
  if (title) return title;

  const questionNumber = cardFile.card.questionNumber?.trim();
  if (questionNumber) return questionNumber;

  return "単体カード";
};

const buildSingleCardArchive = (cardFile: MfCardFileV1): MfDeckArchiveV1 => {
  return {
    manifest: {
      format: MF_DECK_FORMAT,
      version: MF_DECK_VERSION,
      exportedAt: cardFile.exportedAt,
      app: cardFile.app,
      deck: {
        id: cardFile.card.sourceCardId ?? cardFile.card.id,
        name: resolveCardSetName(cardFile),
        cardCount: 1,
      },
      capabilities: cardFile.capabilities,
    },
    cardsJson: {
      format: "manifolia.deck.cards",
      version: MF_DECK_VERSION,
      cards: [cardFile.card],
    },
  };
};

export const importMfCardFile = async ({
  cardFile,
  folderId,
  createCardSet,
  updateCardSet,
  createCard,
  ensureTagByName,
  destination,
}: ImportMfCardFileParams): Promise<ImportMfDeckArchiveResult> => {
  return importMfDeckArchive({
    archive: buildSingleCardArchive(cardFile),
    folderId,
    createCardSet,
    updateCardSet,
    createCard,
    ensureTagByName,
    destination,
  });
};
