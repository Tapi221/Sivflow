import { beforeEach, describe, expect, it, vi } from "vitest";
import { executeXlsxImport, loadXlsxImportFile } from "@/features/import/application/xlsxImportUseCases";
import type { ImportParseResult, ImportPayload } from "@/features/import/domain/import.types";
import type { CardSet } from "@/types";

const {
  parseXlsxImportMock,
  buildImportCardSetNameMock,
  importCardsFromPayloadMock,
} = vi.hoisted(() => ({
  parseXlsxImportMock: vi.fn(),
  buildImportCardSetNameMock: vi.fn(),
  importCardsFromPayloadMock: vi.fn(),
}));

vi.mock("@/features/import/infra/web/parseXlsxImport", () => ({
  parseXlsxImport: parseXlsxImportMock,
}));

vi.mock("@/features/import/application/importCards", () => ({
  buildImportCardSetName: buildImportCardSetNameMock,
  importCardsFromPayload: importCardsFromPayloadMock,
}));

const validPayload: ImportPayload = {
  version: 1,
  source: "xlsx",
  cards: [
    {
      cardId: "card-001",
      title: "カードA",
      frontBlocks: [],
      backBlocks: [],
    },
  ],
};

const validParseResult: ImportParseResult = {
  payload: validPayload,
  issues: [],
};

describe("loadXlsxImportFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ファイル読込と parse を application use case でまとめる", async () => {
    const file = new File(["dummy"], "bulk-import.xlsx");
    const fileBuffer = new ArrayBuffer(16);

    Object.defineProperty(file, "arrayBuffer", {
      writable: true,
      configurable: true,
      value: async () => fileBuffer,
    });

    parseXlsxImportMock.mockResolvedValue(validParseResult);
    buildImportCardSetNameMock.mockReturnValue("bulk-import imported");

    const result = await loadXlsxImportFile(file);

    expect(parseXlsxImportMock).toHaveBeenCalledWith(fileBuffer);
    expect(buildImportCardSetNameMock).toHaveBeenCalledWith("bulk-import.xlsx");
    expect(result).toEqual({
      file,
      result: validParseResult,
      suggestedCardSetName: "bulk-import imported",
    });
  });
});

describe("executeXlsxImport", () => {
  const createCardSet = vi.fn();
  const createCard = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("folderId が無い場合は validation error を返す", async () => {
    const result = await executeXlsxImport({
      folderId: null,
      file: new File(["dummy"], "bulk-import.xlsx"),
      result: validParseResult,
      destinationMode: "new",
      newCardSetName: "bulk-import imported",
      selectedExistingCardSet: null,
      createCardSet,
      createCard,
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: "インポート先フォルダが選択されていません。",
    });
    expect(importCardsFromPayloadMock).not.toHaveBeenCalled();
  });

  it("既存カードセット宛先を application use case で組み立てる", async () => {
    const file = new File(["dummy"], "existing-target.xlsx");
    const selectedExistingCardSet = {
      id: "set-existing",
      name: "既存セット",
      folderId: "folder-001",
    } as CardSet;

    importCardsFromPayloadMock.mockResolvedValue({
      createdCardSetId: "set-existing",
      createdCardSetName: "既存セット",
      folderId: "folder-001",
      createdCount: 1,
    });

    const result = await executeXlsxImport({
      folderId: "folder-001",
      file,
      result: validParseResult,
      destinationMode: "existing",
      newCardSetName: "",
      selectedExistingCardSet,
      createCardSet,
      createCard,
    });

    expect(importCardsFromPayloadMock).toHaveBeenCalledWith({
      payload: validPayload,
      folderId: "folder-001",
      fileName: "existing-target.xlsx",
      createCardSet,
      createCard,
      destination: {
        kind: "existing-card-set",
        cardSetId: "set-existing",
        cardSetName: "既存セット",
      },
    });
    expect(result).toEqual({
      ok: true,
      value: {
        createdCardSetId: "set-existing",
        createdCardSetName: "既存セット",
        folderId: "folder-001",
        createdCount: 1,
      },
    });
  });

  it("blocking error がある場合は import を実行しない", async () => {
    const result = await executeXlsxImport({
      folderId: "folder-001",
      file: new File(["dummy"], "invalid.xlsx"),
      result: {
        payload: validPayload,
        issues: [
          {
            level: "error",
            code: "missing_sheet",
            sheetName: "blocks",
            message: "シート \"blocks\" が見つかりません。",
          },
        ],
      },
      destinationMode: "new",
      newCardSetName: "invalid imported",
      selectedExistingCardSet: null,
      createCardSet,
      createCard,
    });

    expect(result).toEqual({
      ok: false,
      errorMessage: "エラーが残っているためインポートできません。",
    });
    expect(importCardsFromPayloadMock).toHaveBeenCalledTimes(0);
  });
});