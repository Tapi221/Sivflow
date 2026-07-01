import * as XLSX from "xlsx";



const TEMPLATE_FILE_NAME = "flashcard-import-template.xlsx";
const SHEET_NAME = "blocks";
const HEADER_ROW = [
  "cardId",
  "side",
  "blockOrder",
  "type",
  "content",
  "language",
  "image",
  "title",
  "note",
];
const SAMPLE_ROWS = [
  [
    "card-001",
    "front",
    "1",
    "text",
    "最初のテキスト",
    "",
    "",
    "カードA",
    "front のテキスト",
  ],
  [
    "card-001",
    "back",
    "1",
    "code",
    "const sum = (a: number, b: number) => a + b;",
    "typescript",
    "",
    "カードA",
    "back のコード",
  ],
  ["card-002", "front", "1", "markdown", "# 見出し", "", "", "カードB", ""],
  ["card-002", "back", "1", "math", "\\int_0^1 x^2 dx", "", "", "カードB", ""],
];



const buildWorkbook = () => {
  const workbook = XLSX.utils.book_new();

  const rows: string[][] = [HEADER_ROW, ...SAMPLE_ROWS];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 48 },
    { wch: 18 },
    { wch: 24 },
    { wch: 20 },
    { wch: 28 },
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, SHEET_NAME);

  return workbook;
};
const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = "none";

  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
};
const downloadXlsxImportTemplate = () => {
  const workbook = buildWorkbook();

  const arrayBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;

  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, TEMPLATE_FILE_NAME);
};



export { downloadXlsxImportTemplate };
