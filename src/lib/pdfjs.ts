// pdfjs-dist v4 互換: legacy build を使用
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import workerSrc from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";

type PdfjsGlobalWorkerOptions = {
  workerSrc: string;
};

type PdfjsCompatModule = {
  GlobalWorkerOptions: PdfjsGlobalWorkerOptions;
};

type WorkerLogGlobal = typeof globalThis & {
  __pdfWorkerLogged?: boolean;
};

const pdfjsCompat = pdfjsLib as unknown as PdfjsCompatModule;
const globalRef = globalThis as WorkerLogGlobal;

pdfjsCompat.GlobalWorkerOptions.workerSrc = workerSrc;

if (import.meta.env.DEV && globalRef.__pdfWorkerLogged !== true) {
  globalRef.__pdfWorkerLogged = true;
  console.info("[pdfjs] workerSrc", pdfjsCompat.GlobalWorkerOptions.workerSrc);
}

export { pdfjsLib };
