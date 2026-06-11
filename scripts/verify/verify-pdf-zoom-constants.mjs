import { readFileSync } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();
const PDF_PANE_PATH = path.join(ROOT_DIR, "src/features/pdf/PdfPane.tsx");
const PDF_ZOOM_CONSTANTS_PATH = path.join(ROOT_DIR, "src/features/pdf/pdfZoom.constants.ts");

const REQUIRED_SHARED_CONSTANTS = [
  "PDF_TRACKPAD_ZOOM_SENSITIVITY",
  "PDF_ZOOM_BUTTON_SCALE_FACTOR",
  "PDF_ZOOM_MAX_SCALE",
  "PDF_ZOOM_MIN_SCALE",
  "PDF_ZOOM_SCALE_EPSILON",
];
const FORBIDDEN_LOCAL_DEFINITIONS = [
  {
    token: "const PDF_TRACKPAD_ZOOM_SENSITIVITY =",
    message: "PDF_TRACKPAD_ZOOM_SENSITIVITY は src/features/pdf/pdfZoom.constants.ts に移動してください。",
  },
  {
    token: "const PDF_ZOOM_BUTTON_SCALE_FACTOR =",
    message: "PDF_ZOOM_BUTTON_SCALE_FACTOR は src/features/pdf/pdfZoom.constants.ts に移動してください。",
  },
  {
    token: "const PDF_MAX_SCALE =",
    message: "PDF_MAX_SCALE は使わず、src/features/pdf/pdfZoom.constants.ts の PDF_ZOOM_MAX_SCALE を使ってください。",
  },
  {
    token: "const PDF_MIN_SCALE =",
    message: "PDF_MIN_SCALE は使わず、src/features/pdf/pdfZoom.constants.ts の PDF_ZOOM_MIN_SCALE を使ってください。",
  },
  {
    token: "const PDF_SCALE_EPSILON =",
    message: "PDF_SCALE_EPSILON は使わず、src/features/pdf/pdfZoom.constants.ts の PDF_ZOOM_SCALE_EPSILON を使ってください。",
  },
];

const getLineNumber = (source, index) => source.slice(0, index).split("\n").length;

const findFirstViolation = (source, rule) => {
  const index = source.indexOf(rule.token);
  if (index < 0) return null;

  return {
    line: getLineNumber(source, index),
    message: rule.message,
  };
};

const isSharedConstantDefined = (source, constantName) => source.includes(`const ${constantName} =`) || source.includes(`export const ${constantName} =`);

const isSharedConstantExported = (source, constantName) => source.includes(`export const ${constantName} =`) || source.includes(constantName) && source.includes("export {");

const pdfPaneSource = readFileSync(PDF_PANE_PATH, "utf8");
const pdfZoomConstantsSource = readFileSync(PDF_ZOOM_CONSTANTS_PATH, "utf8");

const violations = FORBIDDEN_LOCAL_DEFINITIONS.flatMap((rule) => {
  const violation = findFirstViolation(pdfPaneSource, rule);
  if (!violation) return [];

  return [`src/features/pdf/PdfPane.tsx:${violation.line} ${violation.message}`];
});

for (const constantName of REQUIRED_SHARED_CONSTANTS) {
  if (!isSharedConstantDefined(pdfZoomConstantsSource, constantName)) {
    violations.push(`src/features/pdf/pdfZoom.constants.ts:1 共有 PDF ズーム定数 ${constantName} の定義がありません。`);
  }

  if (!isSharedConstantExported(pdfZoomConstantsSource, constantName)) {
    violations.push(`src/features/pdf/pdfZoom.constants.ts:1 共有 PDF ズーム定数 ${constantName} の export がありません。`);
  }
}

if (violations.length > 0) {
  console.error("PDF ズーム定数規約違反:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}
