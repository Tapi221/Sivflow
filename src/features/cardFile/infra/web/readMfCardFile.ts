import type { MfCardFileV1, MfCardIssue } from "@/features/cardFile/domain/mfCard.types";
import { MF_CARD_FILE_EXTENSION, MfCardValidationError } from "@/features/cardFile/domain/mfCard.types";
import { decodeMfCardFile } from "./mfCardJsonCodec";



type LoadMfCardFileResult = {
  file: File;
  cardFile: MfCardFileV1;
  issues: MfCardIssue[];
  suggestedCardSetName: string;
};



const MAX_MF_CARD_FILE_BYTES = 4 * 1024 * 1024;



const stripMfCardExtension = (fileName: string) => {
  return fileName.replace(/\.mfcard$/i, "").trim();
};
const buildMfCardImportCardSetName = ({ fileName, title }: { fileName: string;
  title?: string;
}) => {
  const baseName =
    (title?.trim() || stripMfCardExtension(fileName)) ?? "単体カード";
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return `${baseName} ${dateLabel}`;
};
const readMfCardFile = async (file: File): Promise<LoadMfCardFileResult> => {
  const issues: MfCardIssue[] = [];

  if (!file.name.toLowerCase().endsWith(MF_CARD_FILE_EXTENSION)) {
    throw new MfCardValidationError("mfcard ファイルではありません。", [
      {
        level: "error",
        code: "invalid_extension",
        message: ".mfcard ファイルを選択してください。",
      },
    ]);
  }

  if (file.size > MAX_MF_CARD_FILE_BYTES) {
    throw new MfCardValidationError("mfcard ファイルが大きすぎます。", [
      {
        level: "error",
        code: "file_too_large",
        message: "mfcard v1 の上限サイズを超えています。",
      },
    ]);
  }

  const buffer = await file.arrayBuffer();
  const cardFile = decodeMfCardFile(buffer);

  return {
    file,
    cardFile,
    issues,
    suggestedCardSetName: buildMfCardImportCardSetName({
      fileName: file.name,
      title: cardFile.card.title,
    }),
  };
};



export { buildMfCardImportCardSetName, readMfCardFile };


export type { LoadMfCardFileResult };
