// pdfjs-dist v4 互換: legacy build を使用
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

// Vite向け: worker URL をバンドル時に確定させる
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
if (import.meta.env.DEV && !(globalThis as any).__pdfWorkerLogged) {
  (globalThis as any).__pdfWorkerLogged = true;
  console.info(
    "[pdfjs] workerSrc",
    (pdfjsLib as any).GlobalWorkerOptions?.workerSrc,
  );
}

export { pdfjsLib };
