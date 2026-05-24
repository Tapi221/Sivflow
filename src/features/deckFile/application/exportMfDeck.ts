<<<<<<< HEAD
import {buildMfDeckArchive,
  type MfDeckTagLookup,} from "@/features/deckFile/application/mapCardToMfDeck";
=======
import { buildMfDeckArchive } from "@/features/deckFile/application/mapCardToMfDeck";
import type { MfDeckTagLookup } from "@/features/deckFile/application/types";
>>>>>>> 975fc9541e4df6ab846d079dcee64139ad5505be
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