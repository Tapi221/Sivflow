import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { Route } from "react-router-dom";
import { DEV_MODE } from "@/utils/envGuards";

const CodeBlockVisualTest = DEV_MODE
  ? lazy(() => import("@/routes/CodeBlockVisualTest"))
  : null;
const CardLayoutConsistencyTest = DEV_MODE
  ? lazy(() => import("@/routes/CardLayoutConsistencyTest"))
  : null;
const BlockNoteSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/blocknote").then(({ BlockNoteSandboxPage }) => ({
        default: BlockNoteSandboxPage,
      })),
    )
  : null;
const KnowledgeSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/logseq").then(({ LogseqSandboxPage }) => ({
        default: LogseqSandboxPage,
      })),
    )
  : null;
const AnkiFsrsSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/anki-fsrs").then(({ AnkiFsrsSandboxPage }) => ({
        default: AnkiFsrsSandboxPage,
      })),
    )
  : null;
const ExcalidrawSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/excalidraw").then(({ ExcalidrawSandboxPage }) => ({
        default: ExcalidrawSandboxPage,
      })),
    )
  : null;
const EditorEnginesSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/editor-engines").then(({ EditorEnginesSandboxPage }) => ({
        default: EditorEnginesSandboxPage,
      })),
    )
  : null;
const PdfOcrSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/pdf-ocr").then(({ PdfOcrSandboxPage }) => ({
        default: PdfOcrSandboxPage,
      })),
    )
  : null;
const PdfConvertersSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/pdf-converters").then(({ PdfConvertersSandboxPage }) => ({
        default: PdfConvertersSandboxPage,
      })),
    )
  : null;
const LicenseNotesSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/license-notes").then(({ LicenseNotesSandboxPage }) => ({
        default: LicenseNotesSandboxPage,
      })),
    )
  : null;
const CalendarTimeGridSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/calendar-time-grid").then(({ CalendarTimeGridSandboxPage }) => ({
        default: CalendarTimeGridSandboxPage,
      })),
    )
  : null;

const withDevRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};

export const getDevStandaloneRouteElement = (
  isTestBypass: boolean,
): ReactNode | null => {
  if (
    CodeBlockVisualTest &&
    isTestBypass &&
    window.location.pathname === "/codeblock-visual-test"
  ) {
    return withDevRouteFallback(<CodeBlockVisualTest />);
  }

  return null;
};

export const getDevRouteElements = () => {
  return (
    <>
      {CodeBlockVisualTest ? (
        <Route
          path="codeblock-visual-test"
          element={withDevRouteFallback(<CodeBlockVisualTest />)}
        />
      ) : null}

      {CardLayoutConsistencyTest ? (
        <Route
          path="card-layout-test"
          element={withDevRouteFallback(<CardLayoutConsistencyTest />)}
        />
      ) : null}

      {BlockNoteSandboxPage ? (
        <Route
          path="sandbox/blocknote/*"
          element={withDevRouteFallback(<BlockNoteSandboxPage />)}
        />
      ) : null}

      {KnowledgeSandboxPage ? (
        <Route
          path="sandbox/logseq/*"
          element={withDevRouteFallback(<KnowledgeSandboxPage />)}
        />
      ) : null}

      {AnkiFsrsSandboxPage ? (
        <Route
          path="sandbox/anki-fsrs/*"
          element={withDevRouteFallback(<AnkiFsrsSandboxPage />)}
        />
      ) : null}

      {ExcalidrawSandboxPage ? (
        <Route
          path="sandbox/excalidraw/*"
          element={withDevRouteFallback(<ExcalidrawSandboxPage />)}
        />
      ) : null}

      {EditorEnginesSandboxPage ? (
        <Route
          path="sandbox/editor-engines/*"
          element={withDevRouteFallback(<EditorEnginesSandboxPage />)}
        />
      ) : null}

      {PdfOcrSandboxPage ? (
        <Route
          path="sandbox/pdf-ocr/*"
          element={withDevRouteFallback(<PdfOcrSandboxPage />)}
        />
      ) : null}

      {PdfConvertersSandboxPage ? (
        <Route
          path="sandbox/pdf-converters/*"
          element={withDevRouteFallback(<PdfConvertersSandboxPage />)}
        />
      ) : null}

      {LicenseNotesSandboxPage ? (
        <Route
          path="sandbox/license-notes/*"
          element={withDevRouteFallback(<LicenseNotesSandboxPage />)}
        />
      ) : null}

      {CalendarTimeGridSandboxPage ? (
        <Route
          path="sandbox/calendar-time-grid/*"
          element={withDevRouteFallback(<CalendarTimeGridSandboxPage />)}
        />
      ) : null}
    </>
  );
};
