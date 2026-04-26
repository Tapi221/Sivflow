import {
  buildMfDeckArchive,
  type MfDeckTagLookup,
} from "@/features/deckFile/application/mapCardToMfDeck";
import { encodeMfDeckArchive } from "@/features/deckFile/infra/web/mfDeckZipCodec";
import type { Card, CardSet } from "@/types";

export const exportMfDeckBytes = async ({
  cardSet,
  cards,
  tagById,
  appVersion,
}: {
  cardSet: CardSet;
  cards: Card[];
  tagById?: MfDeckTagLookup;
  appVersion?: string;
}): Promise<Uint8Array> => {
  const archive = await buildMfDeckArchive({
    cardSet,
    cards,
    tagById,
    appVersion,
  });
  return encodeMfDeckArchive(archive);
};
