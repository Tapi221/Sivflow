# OCR continuation zip

この zip は前回の OCR v1 zip の続きです。

含まれるもの:
- `src/components/pdf/hooks/usePdfOcr.ts`
- `src/lib/pdf/pdfOcrStore.ts`
- `src/lib/pdf/renderPdfPageForOcr.ts`

前回の zip に入っていた `PdfPane.tsx`, `PdfPaneToolbar.tsx`, `package.json` と組み合わせて使ってください。

想定している配線:
- `PdfPane.tsx` から `usePdfOcr(...)` を呼ぶ
- `PdfPaneToolbar.tsx` に `現在OCR / 全体OCR / 中断 / 進捗表示` を渡す
- `package.json` に `tesseract.js` を追加する

実行後の確認:
```bash
npm install
npm run typecheck
npm run build
```
