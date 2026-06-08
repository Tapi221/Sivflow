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
const SelectionCaptureSandboxPage = DEV_MODE
  ? lazy(() => import("@/sandbox/2").then(({ SelectionCaptureSandboxPage }) => ({ default: SelectionCaptureSandboxPage })))
  : null;
const AffineSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/affine").then(({ AffineSandboxPage }) => ({
        default: AffineSandboxPage,
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
const CalendarDndSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/calendar-dnd").then(({ CalendarDndSandboxPage }) => ({
        default: CalendarDndSandboxPage,
      })),
    )
  : null;
const EventChipEditorSandboxPage = DEV_MODE
  ? lazy(() =>
      import("@/sandbox/eventchip-editor").then(({ EventChipEditorSandboxPage }) => ({
        default: EventChipEditorSandboxPage,
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

      {SelectionCaptureSandboxPage ? (
        <Route
          path="sandbox/2/*"
          element={withDevRouteFallback(<SelectionCaptureSandboxPage />)}
        />
      ) : null}

      {AffineSandboxPage ? (
        <Route
          path="sandbox/affine/*"
          element={withDevRouteFallback(<AffineSandboxPage />)}
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

      {CalendarDndSandboxPage ? (
        <Route
          path="sandbox/calendar-dnd/*"
          element={withDevRouteFallback(<CalendarDndSandboxPage />)}
        />
      ) : null}

      {EventChipEditorSandboxPage ? (
        <Route
          path="sandbox/eventchip-editor/*"
          element={withDevRouteFallback(<EventChipEditorSandboxPage />)}
        />
      ) : null}
    </>
  );
};
