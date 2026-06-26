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
const PdfPerformanceTest = DEV_MODE
  ? lazy(() => import("@/routes/PdfPerformanceTest").then(({ PdfPerformanceTest }) => ({ default: PdfPerformanceTest })))
  : null;
const SelectionCaptureSandboxPage = DEV_MODE
  ? lazy(() => import("@/sandbox/2").then(({ SelectionCaptureSandboxPage }) => ({ default: SelectionCaptureSandboxPage })))
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
const ContextMenuSandboxPage = DEV_MODE
  ? lazy(() =>
    import("@/sandbox/context-menu/ContextMenuSandboxPage").then(({ ContextMenuSandboxPage }) => ({
      default: ContextMenuSandboxPage,
    })),
  )
  : null;
const PopoverMenuSandboxPage = DEV_MODE
  ? lazy(() =>
    import("@/sandbox/popover-menu/PopoverMenuSandboxPage").then(({ PopoverMenuSandboxPage }) => ({
      default: PopoverMenuSandboxPage,
    })),
  )
  : null;



const withDevRouteFallback = (element: ReactNode) => {
  return <Suspense fallback={null}>{element}</Suspense>;
};
const getDevStandaloneRouteElement = (isTestBypass: boolean): ReactNode | null => {
  if (ContextMenuSandboxPage && window.location.pathname === "/sandbox/context-menu") {
    return withDevRouteFallback(<ContextMenuSandboxPage />);
  }
  if (PopoverMenuSandboxPage && window.location.pathname === "/sandbox/popover-menu") {
    return withDevRouteFallback(<PopoverMenuSandboxPage />);
  }
  if (CodeBlockVisualTest && isTestBypass && window.location.pathname === "/codeblock-visual-test") {
    return withDevRouteFallback(<CodeBlockVisualTest />);
  }
  if (
    PdfPerformanceTest &&
    isTestBypass &&
    window.location.pathname === "/pdf-performance-test"
  ) {
    return withDevRouteFallback(<PdfPerformanceTest />);
  }
  return null;
};
const getDevRouteElements = () => {
  return (
    <>
      {CodeBlockVisualTest && <Route path="codeblock-visual-test" element={withDevRouteFallback(<CodeBlockVisualTest />)} />}
      {CardLayoutConsistencyTest && <Route path="card-layout-test" element={withDevRouteFallback(<CardLayoutConsistencyTest />)} />}
      {PdfPerformanceTest && <Route path="pdf-performance-test" element={withDevRouteFallback(<PdfPerformanceTest />)} />}
      {SelectionCaptureSandboxPage && <Route path="sandbox/2/*" element={withDevRouteFallback(<SelectionCaptureSandboxPage />)} />}
      {KnowledgeSandboxPage && <Route path="sandbox/logseq/*" element={withDevRouteFallback(<KnowledgeSandboxPage />)} />}
      {AnkiFsrsSandboxPage && <Route path="sandbox/anki-fsrs/*" element={withDevRouteFallback(<AnkiFsrsSandboxPage />)} />}
      {ExcalidrawSandboxPage && <Route path="sandbox/excalidraw/*" element={withDevRouteFallback(<ExcalidrawSandboxPage />)} />}
      {EditorEnginesSandboxPage && <Route path="sandbox/editor-engines/*" element={withDevRouteFallback(<EditorEnginesSandboxPage />)} />}
      {LicenseNotesSandboxPage && <Route path="sandbox/license-notes/*" element={withDevRouteFallback(<LicenseNotesSandboxPage />)} />}
      {CalendarTimeGridSandboxPage && <Route path="sandbox/calendar-time-grid/*" element={withDevRouteFallback(<CalendarTimeGridSandboxPage />)} />}
      {CalendarDndSandboxPage && <Route path="sandbox/calendar-dnd/*" element={withDevRouteFallback(<CalendarDndSandboxPage />)} />}
      {EventChipEditorSandboxPage && <Route path="sandbox/eventchip-editor/*" element={withDevRouteFallback(<EventChipEditorSandboxPage />)} />}
      {ContextMenuSandboxPage && <Route path="sandbox/context-menu/*" element={withDevRouteFallback(<ContextMenuSandboxPage />)} />}
      {PopoverMenuSandboxPage && <Route path="sandbox/popover-menu/*" element={withDevRouteFallback(<PopoverMenuSandboxPage />)} />}
    </>
  );
};



export { getDevStandaloneRouteElement, getDevRouteElements };
