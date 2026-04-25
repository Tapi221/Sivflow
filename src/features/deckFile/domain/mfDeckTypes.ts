import type { CardBlock } from "@/types";
import type { CardDisplayMode } from "@/types/domain/cardSet";

export const MF_DECK_FORMAT = "manifolia.deck" as const;
export const MF_DECK_VERSION = 1 as const;
export const MF_DECK_MANIFEST_PATH = "manifest.json" as const;
export const MF_DECK_CARDS_PATH = "cards.json" as const;
export const MF_DECK_MEDIA_DIRECTORY = "media/" as const;
export const MF_DECK_FILE_EXTENSION = ".mfdeck" as const;
export const MF_DECK_MIME_TYPE = "application/vnd.manifolia.deck+zip" as const;

export type MfDeckIssueLevel = "error" | "warning";

export type MfDeckIssueCode =
  | "invalid_extension"
  | "file_too_large"
  | "missing_manifest"
  | "missing_cards"
  | "invalid_zip"
  | "invalid_json"
  | "invalid_format"
  | "unsupported_version"
  | "invalid_manifest"
  | "invalid_cards"
  | "empty_deck"
  | "card_count_mismatch"
  | "unsupported_media_reference"
  | "unsafe_path"
  | "unexpected_value";

export type MfDeckIssue = {
  level: MfDeckIssueLevel;
  code: MfDeckIssueCode;
  message: string;
  path?: string;
  cardId?: string;
  blockId?: string;
};

export type MfDeckManifestV1 = {
  format: typeof MF_DECK_FORMAT;
  version: typeof MF_DECK_VERSION;
  exportedAt: string;
  app: {
    name: "Manifolia";
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

export type MfDeckCardFlagsV1 = {
  isDraft?: boolean;
  isSilent?: boolean;
  isBookmarked?: boolean;
  hasUncertainty?: boolean;
};

export type MfDeckCardFaceV1 = {
  blocks: CardBlock[];
  extraRows?: number;
  ink?: unknown | null;
};

export type MfDeckCardV1 = {
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

export type MfDeckCardsJsonV1 = {
  format: "manifolia.deck.cards";
  version: typeof MF_DECK_VERSION;
  cards: MfDeckCardV1[];
};

export type MfDeckArchiveV1 = {
  manifest: MfDeckManifestV1;
  cardsJson: MfDeckCardsJsonV1;
};

export type MfDeckValidationResult =
  | {
      ok: true;
      value: MfDeckArchiveV1;
      issues: MfDeckIssue[];
    }
  | {
      ok: false;
      issues: MfDeckIssue[];
    };

export class MfDeckValidationError extends Error {
  readonly issues: MfDeckIssue[];

  constructor(message: string, issues: MfDeckIssue[]) {
    super(message);
    this.name = "MfDeckValidationError";
    this.issues = issues;
  }
}

export class MfDeckExportError extends Error {
  readonly issues: MfDeckIssue[];

  constructor(message: string, issues: MfDeckIssue[]) {
    super(message);
    this.name = "MfDeckExportError";
    this.issues = issues;
  }
}
