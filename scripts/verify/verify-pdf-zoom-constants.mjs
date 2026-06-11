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
    pattern: /\bconst\s+PDF_TRACKPAD_ZOOM_SENSITIVITY\s*=/,
    message: "Move PDF_TRACKPAD_ZOOM_SENSITIVITY to src/features/pdf/pdfZoom.constants.ts.",
  },
  {
    pattern: /\bconst\s+PDF_ZOOM_BUTTON_SCALE_FACTOR\s*=/,
    message: "Move PDF_ZOOM_BUTTON_SCALE_FACTOR to src/features/pdf/pdfZoom.constants.ts.",
  },
  {
    pattern: /\bconst\s+PDF_MAX_SCALE\s*=/,
    message: "Use PDF_ZOOM_MAX_SCALE from src/features/pdf/pdfZoom.constants.ts instead of local PDF_MAX_SCALE.",
  },
  {
    pattern: /\bconst\s+PDF_MIN_SCALE\s*=/,
    message: "Use PDF_ZOOM_MIN_SCALE from src/features/pdf/pdfZoom.constants.ts instead of local PDF_MIN_SCALE.",
  },
  {
    pattern: /\bconst\s+PDF_SCALE_EPSILON\s*=/,
    message: "Use PDF_ZOOM_SCALE_EPSILON from src/features/pdf/pdfZoom.constants.ts instead of local PDF_SCALE_EPSILON.",
  },
];

const getLineNumber = (source, index) => source.slice(0, index).split("\n").length;

const findFirstViolation = (source, rule) => {
  const match = source.match(rule.pattern);
  if (!match || match.index === undefined) return null;

  return {
    line: getLineNumber(source, match.index),
    message: rule.message,
  };
};

const isSharedConstantDefined = (source, constantName) => new RegExp(`\\bconst\\s+${constantName}\\s*=`).test(source);

const isSharedConstantExported = (source, constantName) => {
  const directExportPattern = new RegExp(`export\\s+const\\s+${constantName}\\s*=`);
  const namedExportPattern = new RegExp(`export\\s*\\{[^}]*\\b${constantName}\\b[^}]*\\}`);

  return directExportPattern.test(source) || namedExportPattern.test(source);
};

const pdfPaneSource = readFileSync(PDF_PANE_PATH, "utf8");
const pdfZoomConstantsSource = readFileSync(PDF_ZOOM_CONSTANTS_PATH, "utf8");

const violations = FORBIDDEN_LOCAL_DEFINITIONS.flatMap((rule) => {
  const violation = findFirstViolation(pdfPaneSource, rule);
  if (!violation) return [];

  return [`src/features/pdf/PdfPane.tsx:${violation.line} ${violation.message}`];
});

for (const constantName of REQUIRED_SHARED_CONSTANTS) {
  if (!isSharedConstantDefined(pdfZoomConstantsSource, constantName)) {
    violations.push(`src/features/pdf/pdfZoom.constants.ts:1 Missing shared PDF zoom constant definition: ${constantName}.`);
  }

  if (!isSharedConstantExported(pdfZoomConstantsSource, constantName)) {
    violations.push(`src/features/pdf/pdfZoom.constants.ts:1 Missing shared PDF zoom constant export: ${constantName}.`);
  }
}

if (violations.length > 0) {
  console.error("PDF zoom constant violations:");
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
}
