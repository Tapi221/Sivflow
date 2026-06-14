import type { MfDeckArchiveV1, MfDeckIssue } from "@/features/deckFile/domain/mfDeck.types";
import { MF_DECK_FILE_EXTENSION, MfDeckValidationError } from "@/features/deckFile/domain/mfDeck.types";
import { decodeMfDeckArchive, MF_DECK_MAX_FILE_BYTES } from "./mfDeckZipCodec";



type LoadMfDeckFileResult = {
  file: File;
  archive: MfDeckArchiveV1 | null;
  issues: MfDeckIssue[];
  suggestedCardSetName: string;
};



const buildMfDeckSuggestedCardSetName = (fileName: string): string => {
  const baseName = fileName.replace(new RegExp(`${MF_DECK_FILE_EXTENSION}$`, "i"), "").trim();

  return baseName ?? "インポートしたカードセット";
};
const readMfDeckFile = async (file: File): Promise<LoadMfDeckFileResult> => {
  const issues: MfDeckIssue[] = [];

  if (!file.name.toLowerCase().endsWith(MF_DECK_FILE_EXTENSION)) {
    issues.push({
      level: "error",
      code: "invalid_extension",
      message: "拡張子 .mfdeck のファイルを選択してください。",
    });
  }

  if (file.size > MF_DECK_MAX_FILE_BYTES) {
    issues.push({
      level: "error",
      code: "file_too_large",
      message: "mfdeck ファイルが大きすぎます。",
    });
  }

  if (issues.some((issue) => issue.level === "error")) {
    return {
      file,
      archive: null,
      issues,
      suggestedCardSetName: buildMfDeckSuggestedCardSetName(file.name),
    };
  }

  try {
    const archive = decodeMfDeckArchive(await file.arrayBuffer());

    return {
      file,
      archive,
      issues,
      suggestedCardSetName:
        archive.manifest.deck.name.trim() ||
        buildMfDeckSuggestedCardSetName(file.name),
    };
  } catch (error) {
    if (error instanceof MfDeckValidationError) {
      return {
        file,
        archive: null,
        issues: error.issues,
        suggestedCardSetName: buildMfDeckSuggestedCardSetName(file.name),
      };
    }

    return {
      file,
      archive: null,
      issues: [
        {
          level: "error",
          code: "invalid_zip",
          message: "mfdeck ファイルの読み込みに失敗しました。",
        },
      ],
      suggestedCardSetName: buildMfDeckSuggestedCardSetName(file.name),
    };
  }
};



export { buildMfDeckSuggestedCardSetName, readMfDeckFile };


export type { LoadMfDeckFileResult };
