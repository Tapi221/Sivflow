# PR Template: PDF Zoom Input Confinement

## What Changed

- Confined zoom input handling (`Ctrl/Cmd + Wheel`, trackpad pinch/gesture) to the PDF viewer container only.
- Prevented browser-level zoom and parent scroll chaining when zoom input occurs over the PDF area.
- Added regression unit coverage for zoom scale calculation logic:
  - `src/Components/pdf/pdfZoomUtils.ts`
  - `tests/unit/pdfZoomUtils.test.ts`

## Why

- Prevent accidental browser zoom / global layout reaction during PDF zoom.
- Keep zoom behavior scoped to the PDF viewing area and reduce regressions.

## Scope

- `src/Components/pdf/PdfViewer.tsx`
- `src/Components/pdf/pdfZoomUtils.ts`
- `tests/unit/pdfZoomUtils.test.ts`
- QA docs only (`docs/qa/pdf-zoom.md`, `docs/qa/pdf-zoom-pr.md`)

## Manual QA

- Follow: `docs/qa/pdf-zoom.md`

## Notes

- Any unrelated build warnings are pre-existing and outside this change scope.
