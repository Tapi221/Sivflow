import type { MfDeckCardV1, MfDeckIssue } from "@/features/deckFile/domain/mfDeck.types";



type MfCardIssue = MfDeckIssue;
type MfCardValidationResult = | { ok: true;
  value: MfCardFileV1;
  issues: MfCardIssue[];
}
  | {
    ok: false;
    issues: MfCardIssue[];
  };



const MF_CARD_FORMAT = "sivflow.card" as const;
const MF_CARD_VERSION = 1 as const;



type MfCardFileV1 = {
  format: typeof MF_CARD_FORMAT;
  version: typeof MF_CARD_VERSION;
  exportedAt: string;
  app: {
    name: "Sivflow";
    version?: string;
  };
  card: MfDeckCardV1;
  capabilities?: {
    mediaBundled: boolean;
    tagNames: boolean;
    reviewProgressIncluded: boolean;
  };
};



const MF_CARD_FILE_EXTENSION = ".mfcard" as const;
const MF_CARD_MIME_TYPE = "application/vnd.sivflow.card+json" as const;



class MfCardValidationError extends Error {
  readonly issues: MfCardIssue[];

  constructor(message: string, issues: MfCardIssue[]) {
    super(message);
    this.name = "MfCardValidationError";
    this.issues = issues;
  }
}
class MfCardExportError extends Error {
  readonly issues: MfCardIssue[];

  constructor(message: string, issues: MfCardIssue[]) {
    super(message);
    this.name = "MfCardExportError";
    this.issues = issues;
  }
}



export { MF_CARD_FORMAT, MF_CARD_VERSION, MF_CARD_FILE_EXTENSION, MF_CARD_MIME_TYPE, MfCardValidationError, MfCardExportError };


export type { MfCardIssue, MfCardFileV1, MfCardValidationResult };
