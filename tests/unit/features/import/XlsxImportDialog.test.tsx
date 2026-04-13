// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import type {
  ImportParseResult,
  ImportPayload,
} from "@/features/import/domain/importTypes";
import { XlsxImportDialog } from "@/features/import/presentation/web/XlsxImportDialog";
import type { CardSet } from "@/types";

const {
  loadXlsxImportFileMock,
  executeXlsxImportMock,
  downloadXlsxImportTemplateMock,
  toastMock,
} = vi.hoisted(() => ({
  loadXlsxImportFileMock: vi.fn(),
  executeXlsxImportMock: vi.fn(),
  downloadXlsxImportTemplateMock: vi.fn(),
  toastMock: {
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe = () => {};
    unobserve = () => {};
    disconnect = () => {};
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });

  Object.defineProperty(window, "scrollTo", {
    writable: true,
    configurable: true,
    value: () => {},
  });

  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    writable: true,
    configurable: true,
    value: () => {},
  });

  if (!window.HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(window.HTMLElement.prototype, "hasPointerCapture", {
      writable: true,
      configurable: true,
      value: () => false,
    });
  }

  if (!window.HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(window.HTMLElement.prototype, "setPointerCapture", {
      writable: true,
      configurable: true,
      value: () => {},
    });
  }

  if (!window.HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(
      window.HTMLElement.prototype,
      "releasePointerCapture",
      {
        writable: true,
        configurable: true,
        value: () => {},
      },
    );
  }
});

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => toastMock,
}));

vi.mock("@/features/import/xlsx/downloadXlsxImportTemplate", () => ({
  downloadXlsxImportTemplate: downloadXlsxImportTemplateMock,
}));

vi.mock("@/features/import/application/xlsxImportUseCases", () => ({
  loadXlsxImportFile: loadXlsxImportFileMock,
  executeXlsxImport: executeXlsxImportMock,
}));

afterEach(() => {
  cleanup();
});

const validPayload: ImportPayload = {
  version: 1,
  source: "xlsx",
  cards: [
    {
      cardId: "card-001",
      title: "カードA",
      frontBlocks: [
        {
          type: "text",
          order: 1,
          content: "表面テキスト",
        },
      ],
      backBlocks: [
        {
          type: "markdown",
          order: 1,
          content: "## 裏面",
        },
      ],
    },
    {
      cardId: "card-002",
      title: "カードB",
      frontBlocks: [
        {
          type: "math",
          order: 1,
          content: "\\int_0^1 x^2 dx",
        },
      ],
      backBlocks: [],
    },
  ],
};

const validParseResult: ImportParseResult = {
  payload: validPayload,
  issues: [],
};

const blockingParseResult: ImportParseResult = {
  payload: null,
  issues: [
    {
      level: "error",
      code: "missing_sheet",
      sheetName: "blocks",
      message: 'シート "blocks" が見つかりません。',
    },
  ],
};

const createSpreadsheetFile = (name = "bulk-import.xlsx") => {
  const file = new File(["dummy"], name, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  Object.defineProperty(file, "arrayBuffer", {
    writable: true,
    configurable: true,
    value: async () => new ArrayBuffer(16),
  });

  return file;
};

const uploadFile = async (_container: HTMLElement, file: File) => {
  const input = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;

  if (!input) {
    throw new Error("file input not found");
  }

  const user = userEvent.setup();
  await user.upload(input, file);
};

const renderDialog = (overrides?: {
  folderId?: string | null;
  cardSets?: CardSet[];
  onImported?: (payload: {
    cardSetId: string;
    cardSetName: string;
    folderId: string;
    createdCount: number;
  }) => void;
}) => {
  const createCardSet = vi.fn();
  const createCard = vi.fn();
  const onOpenChange = vi.fn();

  return {
    ...render(
      <XlsxImportDialog
        open={true}
        onOpenChange={onOpenChange}
        folderId={
          overrides && "folderId" in overrides
            ? (overrides.folderId ?? null)
            : "folder-001"
        }
        folderName="サンプルフォルダ"
        cardSets={overrides?.cardSets ?? []}
        onImported={overrides?.onImported}
        createCardSet={createCardSet}
        createCard={createCard}
      />,
    ),
    createCardSet,
    createCard,
    onOpenChange,
  };
};

describe("XlsxImportDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("有効なXLSXを読み込むとプレビュー表示後に新規カードセットとしてインポートできる", async () => {
    loadXlsxImportFileMock.mockImplementation(async (file: File) => ({
      file,
      result: validParseResult,
      suggestedCardSetName: "bulk-import imported",
    }));
    executeXlsxImportMock.mockResolvedValue({
      ok: true,
      value: {
        createdCardSetId: "set-created",
        createdCardSetName: "bulk-import imported",
        folderId: "folder-001",
        createdCount: 2,
      },
    });

    const onImported = vi.fn();
    const { container } = renderDialog({ onImported });

    await uploadFile(container, createSpreadsheetFile());

    await screen.findByText("カードA");
    await screen.findByText("カードB");
    await screen.findByText("bulk-import.xlsx");
    await screen.findByText(/error\s*0\s*\/\s*warning\s*0/i);

    const importButton = screen.getByRole("button", {
      name: "インポートする",
    }) as HTMLButtonElement;

    expect(importButton.disabled).toBe(false);

    const user = userEvent.setup();
    await user.click(importButton);

    await waitFor(() => {
      expect(executeXlsxImportMock).toHaveBeenCalledTimes(1);
    });

    expect(executeXlsxImportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-001",
        file: expect.objectContaining({ name: "bulk-import.xlsx" }),
        result: validParseResult,
        destinationMode: "new",
        newCardSetName: "bulk-import imported",
      }),
    );

    expect(toastMock.success).toHaveBeenCalledWith(
      "2 件のカードをインポートしました。",
    );

    expect(onImported).toHaveBeenCalledWith({
      cardSetId: "set-created",
      cardSetName: "bulk-import imported",
      folderId: "folder-001",
      createdCount: 2,
    });
  });

  it("blocking error があると issue を表示し、インポートボタンを無効化する", async () => {
    loadXlsxImportFileMock.mockImplementation(async (file: File) => ({
      file,
      result: blockingParseResult,
      suggestedCardSetName: "invalid imported",
    }));
    const { container } = renderDialog();

    await uploadFile(container, createSpreadsheetFile("invalid.xlsx"));

    await screen.findByText('シート "blocks" が見つかりません。');

    const importButton = screen.getByRole("button", {
      name: "インポートする",
    }) as HTMLButtonElement;

    expect(importButton.disabled).toBe(true);
    expect(executeXlsxImportMock).not.toHaveBeenCalled();
  });

  it("既存カードセット追加モードでは existing-card-set 宛先でインポートする", async () => {
    loadXlsxImportFileMock.mockImplementation(async (file: File) => ({
      file,
      result: validParseResult,
      suggestedCardSetName: "existing-target imported",
    }));
    executeXlsxImportMock.mockResolvedValue({
      ok: true,
      value: {
        createdCardSetId: "set-existing",
        createdCardSetName: "既存セット",
        folderId: "folder-001",
        createdCount: 2,
      },
    });

    const cardSets: CardSet[] = [
      {
        id: "set-existing",
        name: "既存セット",
        folderId: "folder-001",
      } as CardSet,
    ];

    const { container } = renderDialog({ cardSets });
    await uploadFile(container, createSpreadsheetFile("existing-target.xlsx"));

    await screen.findByText("カードA");

    const user = userEvent.setup();

    const allComboboxes = screen.getAllByRole("combobox");
    expect(allComboboxes.length).toBeGreaterThanOrEqual(1);

    const destinationModeTrigger = allComboboxes[0];
    await user.click(destinationModeTrigger);

    const existingModeOption = await screen.findByRole("option", {
      name: "既存カードセットへ追加",
    });
    await user.click(existingModeOption);

    const updatedComboboxes = screen.getAllByRole("combobox");
    expect(updatedComboboxes.length).toBeGreaterThanOrEqual(2);

    const targetCardSetTrigger = updatedComboboxes[1];
    await user.click(targetCardSetTrigger);

    const existingCardSetOption = await screen.findByRole("option", {
      name: "既存セット",
    });
    await user.click(existingCardSetOption);

    const importButton = await screen.findByRole("button", {
      name: "既存セットへ追加する",
    });

    expect((importButton as HTMLButtonElement).disabled).toBe(false);

    await user.click(importButton);

    await waitFor(() => {
      expect(executeXlsxImportMock).toHaveBeenCalledTimes(1);
    });

    expect(executeXlsxImportMock).toHaveBeenCalledWith(
      expect.objectContaining({
        folderId: "folder-001",
        file: expect.objectContaining({ name: "existing-target.xlsx" }),
        result: validParseResult,
        destinationMode: "existing",
        newCardSetName: "existing-target imported",
        selectedExistingCardSet: expect.objectContaining({
          id: "set-existing",
          name: "既存セット",
        }),
      }),
    );
  });

  it("テンプレートダウンロードボタンで生成処理を呼ぶ", async () => {
    renderDialog();

    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "テンプレートをダウンロード" }),
    );

    expect(downloadXlsxImportTemplateMock).toHaveBeenCalledTimes(1);
  });

  it("folderId が無いときはインポートせずエラートーストを出す", async () => {
    loadXlsxImportFileMock.mockImplementation(async (file: File) => ({
      file,
      result: validParseResult,
      suggestedCardSetName: "no-folder imported",
    }));
    executeXlsxImportMock.mockResolvedValue({
      ok: false,
      errorMessage: "インポート先フォルダが選択されていません。",
    });

    const { container } = renderDialog({ folderId: null });

    await uploadFile(container, createSpreadsheetFile("no-folder.xlsx"));
    await screen.findByText("カードA");

    const importButton = screen.getByRole("button", {
      name: "インポートする",
    });

    const user = userEvent.setup();
    await user.click(importButton);

    expect(executeXlsxImportMock).toHaveBeenCalledTimes(1);
    expect(toastMock.error).toHaveBeenCalledWith(
      "インポート先フォルダが選択されていません。",
    );
  });

  it("issues 一覧にエラー内容を表示する", async () => {
    loadXlsxImportFileMock.mockImplementation(async (file: File) => ({
      file,
      result: {
        payload: null,
        issues: [
          {
            level: "error",
            code: "missing_required_header",
            sheetName: "blocks",
            columnKey: "blockOrder",
            message: '必須ヘッダー "blockOrder" が見つかりません。',
          },
        ],
      } satisfies ImportParseResult,
      suggestedCardSetName: "missing-header imported",
    }));

    const { container } = renderDialog();

    await uploadFile(container, createSpreadsheetFile("missing-header.xlsx"));

    const issuesPanel = (await screen.findAllByText("Issues"))[1];
    const issuesCard = issuesPanel.closest("div");

    expect(
      screen.getByText('必須ヘッダー "blockOrder" が見つかりません。'),
    ).toBeTruthy();

    if (issuesCard) {
      expect(
        within(document.body).getByText(/blocks:blockOrder/i),
      ).toBeTruthy();
    }
  });
});
