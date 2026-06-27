import type { MfDeckTagLookup } from "./mfDeck.types";
import { bundleMediaInMfDeckCards } from "./mfDeckMediaBundler";
import type { MfDeckArchiveV1, MfDeckCardV1, MfDeckIssue } from "@/features/deckFile/domain/mfDeck.types";
import { MF_DECK_FORMAT, MF_DECK_VERSION, MfDeckExportError } from "@/features/deckFile/domain/mfDeck.types";
import type { Card, CardBlock, CardSet } from "@/types";



const toEpoch = (value: unknown): number => {
  if (value instanceof Date) return value.getTime();

  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date; }).toDate === "function"
  ) {
    return (value as { toDate: () => Date; }).toDate().getTime();
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};
const toIsoString = (value: unknown): string => {
  const epoch = toEpoch(value);
  return new Date(epoch || Date.now()).toISOString();
};
const cloneJson = <T>(value: T): T => {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value)) as T;
};
const compareCardsForExport = (left: Card, right: Card): number => {
  const orderDiff = (left.orderIndex ?? 0) - (right.orderIndex ?? 0);
  if (orderDiff !== 0) return orderDiff;

  const createdDiff = toEpoch(left.createdAt) - toEpoch(right.createdAt);
  if (createdDiff !== 0) return createdDiff;

  return left.id.localeCompare(right.id);
};
const resolveTagNames = (
  tagIds: unknown,
  tagById?: MfDeckTagLookup,
): string[] => {
  if (!Array.isArray(tagIds) || !tagById) return [];

  const names = tagIds
    .filter((tagId): tagId is string => typeof tagId === "string")
    .map((tagId) => tagById.get(tagId)?.name ?? "")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  return Array.from(new Set(names));
};
const visitObject = (
  value: unknown,
  visitor: (record: Record<string, unknown>) => void,
): void => {
  if (Array.isArray(value)) {
    value.forEach((item) => visitObject(item, visitor));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  const record = value as Record<string, unknown>;
  visitor(record);
  Object.values(record).forEach((item) => visitObject(item, visitor));
};
const collectMfDeckExportIssues = (cards: Card[]): MfDeckIssue[] => {
  const issues: MfDeckIssue[] = [];

  cards.forEach((card) => {
    const faces = [card.front, card.back];

    faces.forEach((face) => {
      visitObject(face, (record) => {
        const url = record.url ?? record.localUrl ?? record.remoteUrl;

        if (typeof url === "string" && url.startsWith("file:")) {
          issues.push({
            level: "warning",
            code: "unsupported_media_reference",
            cardId: card.id,
            message:
              "file: URL のメディア参照はブラウザから直接読めないため .mfdeck へ同梱できない場合があります。",
          });
        }
      });
    });
  });

  return issues;
};
const mapCardToMfDeckCard = ({ card, tagById }: { card: Card;
  tagById?: MfDeckTagLookup;
}): MfDeckCardV1 => {
  return {
    id: card.id,
    sourceCardId: card.id,
    questionNumber: card.questionNumber,
    title: card.title,
    orderIndex: card.orderIndex ?? 0,
    tagNames: resolveTagNames(card.tagIds, tagById),
    front: {
      blocks: cloneJson(card.front?.blocks ?? []) as CardBlock[],
      extraRows: card.front?.extraRows,
      ink: cloneJson(card.front?.ink ?? null),
    },
    back: {
      blocks: cloneJson(card.back?.blocks ?? []) as CardBlock[],
      extraRows: card.back?.extraRows,
      ink: cloneJson(card.back?.ink ?? null),
    },
    layoutRows: cloneJson(card.layoutRows ?? null),
    flags: {
      isDraft: card.isDraft,
      isSilent: card.isSilent,
      isBookmarked: card.isBookmarked,
      hasUncertainty: card.hasUncertainty,
    },
  };
};
const buildMfDeckArchive = async ({ cardSet, cards, tagById, appVersion }: { cardSet: CardSet;
  cards: Card[];
  tagById?: MfDeckTagLookup;
  appVersion?: string;
}): Promise<MfDeckArchiveV1> => {
  const exportIssues = collectMfDeckExportIssues(cards);
  const blockingIssues = exportIssues.filter(
    (issue) => issue.level === "error",
  );

  if (blockingIssues.length > 0) {
    throw new MfDeckExportError(
      "mfdeck として安全に書き出せないカードがあります。",
      blockingIssues,
    );
  }

  const exportedCards = [...cards]
    .filter((card) => !card.isDeleted)
    .sort(compareCardsForExport)
    .map((card) => mapCardToMfDeckCard({ card, tagById }));

  const mediaBundle = await bundleMediaInMfDeckCards({ cards: exportedCards });
  const mediaBundled = Object.keys(mediaBundle.media).length > 0;

  return {
    manifest: {
      format: MF_DECK_FORMAT,
      version: MF_DECK_VERSION,
      exportedAt: toIsoString(new Date()),
      app: {
        name: "Sivflow",
        ...(appVersion ? { version: appVersion } : {}),
      },
      deck: {
        id: cardSet.id,
        name: cardSet.name?.trim() ?? "無題のカードセット",
        ...(cardSet.description ? { description: cardSet.description } : {}),
        cardCount: exportedCards.length,
        defaultDisplayMode: cardSet.defaultDisplayMode,
      },
      capabilities: {
        mediaBundled,
        tagNames: true,
        reviewProgressIncluded: false,
      },
    },
    cardsJson: {
      format: "sivflow.deck.cards",
      version: MF_DECK_VERSION,
      cards: exportedCards,
    },
    ...(mediaBundle.mediaManifest
      ? { mediaManifest: mediaBundle.mediaManifest }
      : {}),
    ...(mediaBundled ? { media: mediaBundle.media } : {}),
  };
};



export { collectMfDeckExportIssues, mapCardToMfDeckCard, buildMfDeckArchive };
