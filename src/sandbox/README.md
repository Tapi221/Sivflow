# Sandbox routes

Development sandbox route list.

## Routes

| Route | Source | Purpose |
| --- | --- | --- |
| `/sandbox/2` | `src/sandbox/2` | Selection capture sandbox |
| `/sandbox/affine` | `src/sandbox/affine` | AFFiNE / BlockSuite editor sandbox |
| `/sandbox/logseq` | `src/sandbox/logseq` | Logseq reference notes |
| `/sandbox/anki-fsrs` | `src/sandbox/anki-fsrs` | Anki / FSRS4Anki review design notes |
| `/sandbox/excalidraw` | `src/sandbox/excalidraw` | Excalidraw handwriting and diagram UI reference |
| `/sandbox/editor-engines` | `src/sandbox/editor-engines` | Tiptap / Plate / Milkdown editor comparison |
| `/sandbox/license-notes` | `src/sandbox/license-notes` | License notes for reference OSS |
| `/sandbox/calendar-time-grid` | `src/sandbox/calendar-time-grid` | Time-grid event chip overlap sandbox |

## Shared components

| Source | Purpose |
| --- | --- |
| `src/sandbox/reference/ReferenceSandboxPage.tsx` | Shared reference sandbox layout |

## Notes

- Sandbox routes are for development mode.
- Route definitions live in `packages/web-renderer/src/app/routing/DevRoutes.tsx`.
- If normal routes redirect to schedule, check `REDIRECT_TO_SCHEDULE_ROUTES` in `packages/web-renderer/src/app/routing/AppRoutes.tsx`.
