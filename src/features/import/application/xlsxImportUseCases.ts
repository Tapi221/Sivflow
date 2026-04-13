import {
  buildImportCardSetName,
  importCardsFromPayload,
  type ImportDestination,
} from "@/features/import/application/importCards";
import {
  hasImportBlockingError,
  type ImportParseResult,
} from "@/features/import/domain/importTypes";
import { parseXlsxImport } from "@/features/import/infra/web/parseXlsxImport";
import type { Card, CardSet } from "@/types";

export type CreateCardSet = (
  name: string,
  targetFolderId?: string | null,
  opts?: {
    description?: string;
    id?: string;
    orderIndex?: number;
  },
) => Promise<CardSet>;

export type CreateCard = (
  cardData: Partial<Card> & { cardSetId?: string },
) => Promise<Card>;

export type ImportDestinationMode = "new" | "existing";

export type LoadXlsxImportFileResult = {
  file: File;
  result: ImportParseResult;
  suggestedCardSetName: string;
};

type ExecuteXlsxImportParams = {
  folderId: string | null;
  file: File | null;
  result: ImportParseResult | null;
  destinationMode: ImportDestinationMode;
  newCardSetName: string;
  selectedExistingCardSet: CardSet | null;
  createCardSet: CreateCardSet;
  createCard: CreateCard;
};

type ExecuteXlsxImportFailure = {
  ok: false;
  errorMessage: string;
};

type ExecuteXlsxImportSuccess = {
  ok: true;
  value: Awaited<ReturnType<typeof importCardsFromPayload>>;
};

export type ExecuteXlsxImportResult =
  | ExecuteXlsxImportFailure
  | ExecuteXlsxImportSuccess;

const resolveImportDestination = ({
  destinationMode,
  newCardSetName,
  selectedExistingCardSet,
}: Pick<
  ExecuteXlsxImportParams,
  "destinationMode" | "newCardSetName" | "selectedExistingCardSet"
>): ExecuteXlsxImportFailure | { ok: true; value: ImportDestination } => {
  if (destinationMode === "new") {
    const cardSetName = newCardSetName.trim();

    if (cardSetName === "") {
      return {
        ok: false,
        errorMessage: "新規カードセット名を入力してください。",
      };
    }

    return {
      ok: true,
      value: {
        kind: "new-card-set",
        cardSetName,
      },
    };
  }

  if (!selectedExistingCardSet) {
    return {
      ok: false,
      errorMessage: "追加先のカードセットを選択してください。",
    };
  }

  return {
    ok: true,
    value: {
      kind: "existing-card-set",
      cardSetId: selectedExistingCardSet.id,
      cardSetName: selectedExistingCardSet.name,
    },
  };
};

export const loadXlsxImportFile = async (
  file: File,
): Promise<LoadXlsxImportFileResult> => {
  const fileBuffer = await file.arrayBuffer();
  const result = await parseXlsxImport(fileBuffer);

  return {
    file,
    result,
    suggestedCardSetName: buildImportCardSetName(file.name),
  };
};

export const executeXlsxImport = async ({
  folderId,
  file,
  result,
  destinationMode,
  newCardSetName,
  selectedExistingCardSet,
  createCardSet,
  createCard,
}: ExecuteXlsxImportParams): Promise<ExecuteXlsxImportResult> => {
  if (!folderId) {
    return {
      ok: false,
      errorMessage: "インポート先フォルダが選択されていません。",
    };
  }

  if (!file || !result?.payload) {
    return {
      ok: false,
      errorMessage: "先に有効な XLSX ファイルを読み込んでください。",
    };
  }

  if (hasImportBlockingError(result)) {
    return {
      ok: false,
      errorMessage: "エラーが残っているためインポートできません。",
    };
  }

  const destination = resolveImportDestination({
    destinationMode,
    newCardSetName,
    selectedExistingCardSet,
  });

  if (!destination.ok) {
    return destination;
  }

  return {
    ok: true,
    value: await importCardsFromPayload({
      payload: result.payload,
      folderId,
      fileName: file.name,
      createCardSet,
      createCard,
      destination: destination.value,
    }),
  };
};
