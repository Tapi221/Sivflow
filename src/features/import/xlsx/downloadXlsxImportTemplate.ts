import * as XLSX from "xlsx";

import { IMPORT_SHEET_NAME } from "@/features/import/types";

const TEMPLATE_FILE_NAME = "manifolia-bulk-import-template.xlsx";

const BLOCKS_ROWS = [
  [
    "cardId",
    "blockOrder",
    "type",
    "content",
    "language",
    "image",
    "title",
    "note",
  ],
  [
    "sample-001",
    "1",
    "text",
    "これは text ブロックです。",
    "",
    "",
    "サンプルカードA",
    "同じ cardId の行は同じカードになります。",
  ],
  [
    "sample-001",
    "2",
    "markdown",
    "# 見出し\n- 箇条書き\n- 箇条書き",
    "",
    "",
    "サンプルカードA",
    "",
  ],
  [
    "sample-001",
    "3",
    "math",
    "\\\\int_0^1 x^2 dx",
    "",
    "",
    "サンプルカードA",
    "",
  ],
  [
    "sample-001",
    "4",
    "code",
    "const sum = (a: number, b: number) => a + b;",
    "typescript",
    "",
    "サンプルカードA",
    "language は code のときだけ使います。",
  ],
  [
    "sample-002",
    "1",
    "text",
    "cardId が変わると別カードです。",
    "",
    "",
    "サンプルカードB",
    "",
  ],
];

const README_ROWS = [
  ["項目", "説明"],
  ["必須ヘッダー", "cardId / blockOrder / type"],
  [
    "type",
    "text / markdown / math / code を使用可能。image は phase 1 では未対応。",
  ],
  ["cardId", "同じ値の行を 1 枚のカードにグルーピングします。"],
  ["blockOrder", "1 以上の整数。front 側の表示順になります。"],
  ["content", "text / markdown / math / code では必須です。"],
  [
    "language",
    "type=code のときだけ指定します。未指定なら plaintext 扱いです。",
  ],
  ["image", "将来の画像インポート用の予約列です。phase 1 では使いません。"],
  ["title", "同じ cardId 内で最初に見つかった title を採用します。"],
];

/**
 * インポート用の XLSX テンプレートを生成してダウンロードする
 */
export const downloadXlsxImportTemplate = () => {
  const workbook = XLSX.utils.book_new();

  // blocks シートを作成 (aoa: array of arrays)
  const blocksSheet = XLSX.utils.aoa_to_sheet(BLOCKS_ROWS);
  blocksSheet["!cols"] = [
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 48 },
    { wch: 16 },
    { wch: 16 },
    { wch: 24 },
    { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(workbook, blocksSheet, IMPORT_SHEET_NAME);

  // readme シートを作成
  const readmeSheet = XLSX.utils.aoa_to_sheet(README_ROWS);
  readmeSheet["!cols"] = [{ wch: 18 }, { wch: 84 }];
  XLSX.utils.book_append_sheet(workbook, readmeSheet, "readme");

  // ブラウザでファイルダウンロードを実行
  XLSX.writeFileXLSX(workbook, TEMPLATE_FILE_NAME, { compression: true });
};
