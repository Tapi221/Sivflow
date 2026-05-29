import type { MfDeckCardV1, MfDeckIssue } from "@/features/deckFile/domain/mfDeck.types";

export const MF_CARD_FORMAT = "manifolia.card" as const;
export const MF_CARD_VERSION = 1 as const;
export const MF_CARD_FILE_EXTENSION = ".mfcard" as const;
export const MF_CARD_MIME_TYPE = "application/vnd.manifolia.card+json" as const;

export type MfCardIssue = MfDeckIssue;

export type MfCardFileV1 = {
  format: typeof MF_CARD_FORMAT;
  version: typeof MF_CARD_VERSION;
  exportedAt: string;
  app: {
    name: "Solifa";
    version?: string;
  };
  card: MfDeckCardV1;
  capabilities?: {
    mediaBundled: boolean;
    tagNames: boolean;
    reviewProgressIncluded: boolean;
  };
};

export type MfCardValidationResult =
  | {
    ok: true;
    value: MfCardFileV1;
    issues: MfCardIssue[];
  }
  | {
    ok: false;
    issues: MfCardIssue[];
  };

export class MfCardValidationError extends Error {
  readonly issues: MfCardIssue[];

  constructor(message: string, issues: MfCardIssue[]) {
    super(message);
    this.name = "MfCardValidationError";
    this.issues = issues;
  }
}

export class MfCardExportError extends Error {
  readonly issues: MfCardIssue[];

  constructor(message: string, issues: MfCardIssue[]) {
    super(message);
    this.name = "MfCardExportError";
    this.issues = issues;
  }
}
