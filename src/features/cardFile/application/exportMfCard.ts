import {
  collectMfDeckExportIssues,
  mapCardToMfDeckCard,
  type MfDeckTagLookup,
} from "@/features/deckFile/application/mapCardToMfDeck";
import type { Card } from "@/types";
import {
  MF_CARD_FORMAT,
  MF_CARD_VERSION,
  MfCardExportError,
  type MfCardFileV1,
} from "@/features/cardFile/domain/mfCardTypes";
import { encodeMfCardFile } from "@/features/cardFile/infra/web/mfCardJsonCodec";

export const buildMfCardFile = ({
  card,
  tagById,
  appVersion,
}: {
  card: Card;
  tagById?: MfDeckTagLookup;
  appVersion?: string;
}): MfCardFileV1 => {
  const exportIssues = collectMfDeckExportIssues([card]);
  const blockingIssues = exportIssues.filter((issue) => issue.level === "error");

  if (blockingIssues.length > 0) {
    throw new MfCardExportError(
      "mfcard として安全に書き出せないカードです。",
      blockingIssues,
    );
  }

  return {
    format: MF_CARD_FORMAT,
    version: MF_CARD_VERSION,
    exportedAt: new Date().toISOString(),
    app: {
      name: "Manifolia",
      ...(appVersion ? { version: appVersion } : {}),
    },
    card: mapCardToMfDeckCard({ card, tagById }),
    capabilities: {
      mediaBundled: false,
      tagNames: true,
      reviewProgressIncluded: false,
    },
  };
};

export const exportMfCardBytes = (params: {
  card: Card;
  tagById?: MfDeckTagLookup;
  appVersion?: string;
}) => {
  return encodeMfCardFile(buildMfCardFile(params));
};
