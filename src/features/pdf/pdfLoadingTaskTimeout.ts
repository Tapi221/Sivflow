type PdfLoadingTaskLike<T> = {
  promise: Promise<T>;
  destroy?: () => Promise<void> | void;
};



const DEFAULT_PDF_LOAD_TIMEOUT_MS = 30_000;
const PDF_LOAD_TIMEOUT_ERROR_MESSAGE = "PDFの読み込みがタイムアウトしました。ネットワーク接続を確認して、もう一度開き直してください。";



const destroyPdfLoadingTaskQuietly = <T>(loadingTask: PdfLoadingTaskLike<T>): void => {
  try {
    const result = loadingTask.destroy?.();
    if (result && typeof result.catch === "function") {
      void result.catch(() => undefined);
    }
  } catch {
    // Timeout cleanup should not hide the timeout error shown to the user.
  }
};
const waitForPdfLoadingTask = async <T>(
  loadingTask: PdfLoadingTaskLike<T>,
  timeoutMs = DEFAULT_PDF_LOAD_TIMEOUT_MS,
): Promise<T> => {
  let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = globalThis.setTimeout(() => {
      destroyPdfLoadingTaskQuietly(loadingTask);
      reject(new Error(PDF_LOAD_TIMEOUT_ERROR_MESSAGE));
    }, timeoutMs);
  });

  try {
    return await Promise.race([loadingTask.promise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) {
      globalThis.clearTimeout(timeoutId);
    }
  }
};



export { DEFAULT_PDF_LOAD_TIMEOUT_MS, PDF_LOAD_TIMEOUT_ERROR_MESSAGE, waitForPdfLoadingTask };
