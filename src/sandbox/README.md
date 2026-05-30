# Sandbox routes

開発用の sandbox ページ一覧です。パスを忘れたときはこのファイルを見る。

## Routes

| Route | Source | 用途 |
| --- | --- | --- |
| `/sandbox/blocknote` | `src/sandbox/blocknote` | BlockNote の表示・操作確認 |
| `/sandbox/logseq` | `src/sandbox/logseq` | Logseq の設計参考メモ |
| `/sandbox/anki-fsrs` | `src/sandbox/anki-fsrs` | Anki / FSRS4Anki の復習設計参考 |
| `/sandbox/excalidraw` | `src/sandbox/excalidraw` | Excalidraw の手書き・図解 UI 参考 |
| `/sandbox/editor-engines` | `src/sandbox/editor-engines` | Tiptap / Plate / Milkdown のエディタ設計比較 |
| `/sandbox/pdf-ocr` | `src/sandbox/pdf-ocr` | PDF.js / PAWLS / Tesseract.js の教材インポート参考 |
| `/sandbox/pdf-converters` | `src/sandbox/pdf-converters` | MinerU / Marker / Docling などPDF変換OSS候補 |
| `/sandbox/license-notes` | `src/sandbox/license-notes` | Outline / tldraw などライセンス注意付き参考 |
| `/sandbox/calendar-time-grid` | `src/sandbox/calendar-time-grid` | time-grid event chip の重なり表示確認 |

## Shared components

| Source | 用途 |
| --- | --- |
| `src/sandbox/reference/ReferenceSandboxPage.tsx` | 参考OSS sandboxページの共通レイアウト |

## Notes

- sandbox route は開発モード用です。
- route 定義は `packages/web-renderer/src/app/routing/DevRoutes.tsx` にあります。
- 通常 route から schedule にリダイレクトされる場合は、`packages/web-renderer/src/app/routing/AppRoutes.tsx` の `REDIRECT_TO_SCHEDULE_ROUTES` を確認する。
