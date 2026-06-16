import { buildMfDeckArchive } from "./mapCardToMfDeck";
import type { MfDeckTagLookup } from "./mfDeck.types";
import { encodeMfDeckArchive } from "@/features/deckFile/infra/web/mfDeckZipCodec";
import type { Card, CardSet } from "@/types";



const exportMfDeckBytes = async ({ cardSet, cards, tagById, appVersion }: { cardSet: CardSet;
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



export { exportMfDeckBytes };
