import type { CardBlock } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";



type MfDeckIssueLevel = "error" | "warning";
type MfDeckIssueCode = | "invalid_extension" | "file_too_large" | "missing_manifest" | "missing_cards" | "missing_media" | "invalid_zip" | "invalid_json" | "invalid_format" | "unsupported_version" | "invalid_manifest" | "invalid_cards" | "invalid_media_manifest" | "empty_deck" | "card_count_mismatch" | "unsupported_media_reference" | "unreadable_media" | "unsafe_path" | "unexpected_value" | "duplicate_card_id" | "duplicate_block_id" | "duplicate_media_path" | "too_many_cards" | "too_many_blocks" | "too_many_media_entries" | "media_size_mismatch" | "unknown_media_entry" | "invalid_media_reference";
type MfDeckIssue = {
  level: MfDeckIssueLevel;
  code: MfDeckIssueCode;
  message: string;
  path?: string;
  cardId?: string;
  blockId?: string;
};
type MfDeckMediaKindV1 = "image" | "audio" | "unknown";
type MfDeckMediaEntryV1 = {
  path: string;
  kind: MfDeckMediaKindV1;
  mimeType: string;
  sizeBytes: number;
  sourceName?: string;
  sourceUrlHash?: string;
};
type MfDeckCardFlagsV1 = {
  isDraft?: boolean;
  isSilent?: boolean;
  isBookmarked?: boolean;
  hasUncertainty?: boolean;
};
type MfDeckCardFaceV1 = {
  blocks: CardBlock[];
  extraRows?: number;
  ink?: unknown | null;
};
type MfDeckCardV1 = {
  id: string;
  sourceCardId?: string;
  questionNumber?: string;
  title?: string;
  orderIndex: number;
  tagNames?: string[];
  front: MfDeckCardFaceV1;
  back: MfDeckCardFaceV1;
  layoutRows?: unknown;
  flags?: MfDeckCardFlagsV1;
};
type MfDeckArchiveV1 = {
  manifest: MfDeckManifestV1;
  cardsJson: MfDeckCardsJsonV1;
  mediaManifest?: MfDeckMediaManifestV1;
  media?: Record<string, Uint8Array>;
};
type MfDeckValidationResult = | { ok: true;
  value: MfDeckArchiveV1;
  issues: MfDeckIssue[];
}
  | {
    ok: false;
    issues: MfDeckIssue[];
  };



const MF_DECK_FORMAT = "sivflow.deck" as const;
const MF_DECK_VERSION = 1 as const;



type MfDeckMediaManifestV1 = {
  format: "sivflow.deck.media";
  version: typeof MF_DECK_VERSION;
  media: MfDeckMediaEntryV1[];
};
type MfDeckManifestV1 = {
  format: typeof MF_DECK_FORMAT;
  version: typeof MF_DECK_VERSION;
  exportedAt: string;
  app: {
    name: "Sivflow";
    version?: string;
  };
  deck: {
    id: string;
    name: string;
    description?: string;
    cardCount: number;
    defaultDisplayMode?: CardDisplayMode;
  };
  capabilities?: {
    mediaBundled: boolean;
    tagNames: boolean;
    reviewProgressIncluded: boolean;
  };
};
type MfDeckCardsJsonV1 = {
  format: "sivflow.deck.cards";
  version: typeof MF_DECK_VERSION;
  cards: MfDeckCardV1[];
};



const MF_DECK_MANIFEST_PATH = "manifest.json" as const;
const MF_DECK_CARDS_PATH = "cards.json" as const;
const MF_DECK_MEDIA_DIRECTORY = "media/" as const;
const MF_DECK_MEDIA_MANIFEST_PATH = "media/manifest.json" as const;
const MF_DECK_FILE_EXTENSION = ".mfdeck" as const;
const MF_DECK_MIME_TYPE = "application/vnd.sivflow.deck+zip" as const;
const MF_DECK_MEDIA_URI_PREFIX = "mfdeck://media/" as const;
const MF_DECK_MAX_CARDS = 50000 as const;
const MF_DECK_MAX_BLOCKS_PER_FACE = 1000 as const;
const MF_DECK_MAX_MEDIA_ENTRIES = 5000 as const;



class MfDeckValidationError extends Error {
  readonly issues: MfDeckIssue[];

  constructor(message: string, issues: MfDeckIssue[]) {
    super(message);
    this.name = "MfDeckValidationError";
    this.issues = issues;
  }
}
class MfDeckExportError extends Error {
  readonly issues: MfDeckIssue[];

  constructor(message: string, issues: MfDeckIssue[]) {
    super(message);
    this.name = "MfDeckExportError";
    this.issues = issues;
  }
}



export { MF_DECK_FORMAT, MF_DECK_VERSION, MF_DECK_MANIFEST_PATH, MF_DECK_CARDS_PATH, MF_DECK_MEDIA_DIRECTORY, MF_DECK_MEDIA_MANIFEST_PATH, MF_DECK_FILE_EXTENSION, MF_DECK_MIME_TYPE, MF_DECK_MEDIA_URI_PREFIX, MF_DECK_MAX_CARDS, MF_DECK_MAX_BLOCKS_PER_FACE, MF_DECK_MAX_MEDIA_ENTRIES, MfDeckValidationError, MfDeckExportError };


export type { MfDeckIssueLevel, MfDeckIssueCode, MfDeckIssue, MfDeckMediaKindV1, MfDeckMediaEntryV1, MfDeckMediaManifestV1, MfDeckManifestV1, MfDeckCardFlagsV1, MfDeckCardFaceV1, MfDeckCardV1, MfDeckCardsJsonV1, MfDeckArchiveV1, MfDeckValidationResult };
