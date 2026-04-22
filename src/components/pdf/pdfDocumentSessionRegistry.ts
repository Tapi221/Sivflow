import { clearPdfPageBitmapCacheForDocument } from "@/components/pdf/pdfPageBitmapCache";
import type {
  PdfJsDocument,
  PdfJsGetDocumentParams,
  PdfJsLoadingTask,
  PdfViewerSourceMeta,
} from "@/components/pdf/pdfViewerTypes";
import {
  destroyPdfResource,
  disposePdfDocumentResource,
  getPdfDocument,
} from "@/components/pdf/pdfViewerTypes";

export const PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS = 5_000;

interface PdfDocumentSessionSource {
  url?: string | null;
  data?: Uint8Array | null;
}

interface AcquirePdfDocumentSessionOptions {
  source: PdfDocumentSessionSource;
  sourceMeta?: PdfViewerSourceMeta;
  getDocumentParams: PdfJsGetDocumentParams;
}

interface PdfDocumentSessionValue {
  pdf: PdfJsDocument;
  documentKey: string;
}

export interface PdfDocumentSessionLease {
  sessionKey: string;
  documentPromise: Promise<PdfDocumentSessionValue>;
  release: () => void;
}

interface PdfDocumentSessionEntry {
  key: string;
  loadingTask: PdfJsLoadingTask;
  referenceCount: number;
  pendingDisposeTimerId: ReturnType<typeof globalThis.setTimeout> | null;
  documentPromise: Promise<PdfDocumentSessionValue>;
  resolvedValue: PdfDocumentSessionValue | null;
  disposed: boolean;
}

const pdfDocumentSessionRegistry = new Map<string, PdfDocumentSessionEntry>();

const normalizeSourceToken = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const hashPdfBytes = (bytes: Uint8Array): string => {
  let forwardHash = 0x811c9dc5;
  let reverseHash = 0x811c9dc5;

  for (let index = 0; index < bytes.byteLength; index += 1) {
    const nextByte = bytes[index] ?? 0;
    const nextReverseByte = bytes[bytes.byteLength - 1 - index] ?? 0;

    forwardHash ^= nextByte;
    forwardHash = Math.imul(forwardHash, 0x01000193) >>> 0;

    reverseHash ^= nextReverseByte;
    reverseHash = Math.imul(reverseHash, 0x01000193) >>> 0;
  }

  return [
    bytes.byteLength.toString(16),
    forwardHash.toString(16).padStart(8, "0"),
    reverseHash.toString(16).padStart(8, "0"),
  ].join(":");
};

const buildPdfDocumentSourceIdentity = ({
  source,
  sourceMeta,
  getDocumentParams,
}: AcquirePdfDocumentSessionOptions): string => {
  const resolvedUrl =
    normalizeSourceToken(getDocumentParams.url) ??
    normalizeSourceToken(source.url) ??
    normalizeSourceToken(sourceMeta?.remoteUrl) ??
    normalizeSourceToken(sourceMeta?.url);

  if (resolvedUrl) {
    return `url:${resolvedUrl}`;
  }

  const resolvedData =
    getDocumentParams.data instanceof Uint8Array
      ? getDocumentParams.data
      : source.data instanceof Uint8Array
        ? source.data
        : null;

  if (resolvedData) {
    const localFileId = normalizeSourceToken(sourceMeta?.localFileId);
    const dataHash = hashPdfBytes(resolvedData);

    if (localFileId) {
      return `local:${localFileId}:${dataHash}`;
    }

    return `bytes:${dataHash}`;
  }

  return "unresolved";
};

const buildPdfDocumentOptionsIdentity = (
  getDocumentParams: PdfJsGetDocumentParams,
): string => {
  const verbosity =
    typeof getDocumentParams.verbosity === "number" &&
    Number.isFinite(getDocumentParams.verbosity)
      ? String(getDocumentParams.verbosity)
      : "-";

  return [
    `xfa:${getDocumentParams.enableXfa ? "1" : "0"}`,
    `sysfonts:${getDocumentParams.useSystemFonts ? "1" : "0"}`,
    `cmap:${normalizeSourceToken(getDocumentParams.cMapUrl) ?? "-"}`,
    `cmappacked:${getDocumentParams.cMapPacked === false ? "0" : "1"}`,
    `stdfonts:${normalizeSourceToken(getDocumentParams.standardFontDataUrl) ?? "-"}`,
    `fontface:${getDocumentParams.disableFontFace ? "0" : "1"}`,
    `verbosity:${verbosity}`,
  ].join("|");
};

const buildPdfDocumentSessionKey = (
  options: AcquirePdfDocumentSessionOptions,
): string => {
  const sourceIdentity = buildPdfDocumentSourceIdentity(options);
  const optionsIdentity = buildPdfDocumentOptionsIdentity(
    options.getDocumentParams,
  );

  return `${sourceIdentity}|${optionsIdentity}`;
};

const createSessionDisposedAbortError = (): Error => {
  if (typeof DOMException !== "undefined") {
    return new DOMException(
      "PDF document session was disposed before resolution",
      "AbortError",
    );
  }

  const error = new Error(
    "PDF document session was disposed before resolution",
  );
  error.name = "AbortError";
  return error;
};

const buildStableDocumentKey = ({
  pdf,
  source,
  sourceMeta,
  getDocumentParams,
}: {
  pdf: PdfJsDocument;
  source: PdfDocumentSessionSource;
  sourceMeta?: PdfViewerSourceMeta;
  getDocumentParams: PdfJsGetDocumentParams;
}): string => {
  const fingerprint = pdf.fingerprints?.[0] ?? null;
  if (typeof fingerprint === "string" && fingerprint.length > 0) {
    return `fingerprint:${fingerprint}`;
  }

  const remoteUrl =
    normalizeSourceToken(sourceMeta?.remoteUrl) ??
    normalizeSourceToken(sourceMeta?.url) ??
    normalizeSourceToken(getDocumentParams.url) ??
    normalizeSourceToken(source.url);

  if (remoteUrl) {
    return `url:${remoteUrl}`;
  }

  const localFileId = normalizeSourceToken(sourceMeta?.localFileId);
  if (localFileId) {
    return `local:${localFileId}`;
  }

  const resolvedData =
    getDocumentParams.data instanceof Uint8Array
      ? getDocumentParams.data
      : source.data instanceof Uint8Array
        ? source.data
        : null;

  if (resolvedData) {
    return `bytes:${hashPdfBytes(resolvedData)}`;
  }

  return "bytes:unknown";
};

const clearPendingDisposeTimer = (entry: PdfDocumentSessionEntry): void => {
  if (entry.pendingDisposeTimerId === null) {
    return;
  }

  globalThis.clearTimeout(entry.pendingDisposeTimerId);
  entry.pendingDisposeTimerId = null;
};

const disposePdfDocumentSessionEntry = (
  entry: PdfDocumentSessionEntry,
): void => {
  if (entry.disposed) {
    return;
  }

  entry.disposed = true;
  clearPendingDisposeTimer(entry);

  if (pdfDocumentSessionRegistry.get(entry.key) === entry) {
    pdfDocumentSessionRegistry.delete(entry.key);
  }

  const resolvedDocumentKey = entry.resolvedValue?.documentKey ?? null;
  if (resolvedDocumentKey) {
    clearPdfPageBitmapCacheForDocument(resolvedDocumentKey);
  }

  disposePdfDocumentResource(entry.resolvedValue?.pdf);
  destroyPdfResource(entry.loadingTask);
};

const schedulePdfDocumentSessionDispose = (
  entry: PdfDocumentSessionEntry,
): void => {
  clearPendingDisposeTimer(entry);

  entry.pendingDisposeTimerId = globalThis.setTimeout(() => {
    entry.pendingDisposeTimerId = null;

    if (entry.referenceCount > 0) {
      return;
    }

    disposePdfDocumentSessionEntry(entry);
  }, PDF_DOCUMENT_SESSION_RELEASE_GRACE_MS);
};

const createPdfDocumentSessionEntry = (
  options: AcquirePdfDocumentSessionOptions,
): PdfDocumentSessionEntry => {
  const key = buildPdfDocumentSessionKey(options);
  const loadingTask = getPdfDocument(options.getDocumentParams);

  const entry = {
    key,
    loadingTask,
    referenceCount: 0,
    pendingDisposeTimerId: null,
    resolvedValue: null,
    disposed: false,
    documentPromise: Promise.resolve({
      pdf: null as unknown as PdfJsDocument,
      documentKey: "",
    }),
  } satisfies PdfDocumentSessionEntry;

  const nextDocumentPromise = loadingTask.promise
    .then((pdf) => {
      const nextValue = {
        pdf,
        documentKey: buildStableDocumentKey({
          pdf,
          source: options.source,
          sourceMeta: options.sourceMeta,
          getDocumentParams: options.getDocumentParams,
        }),
      } satisfies PdfDocumentSessionValue;

      if (entry.disposed) {
        clearPdfPageBitmapCacheForDocument(nextValue.documentKey);
        disposePdfDocumentResource(nextValue.pdf);
        throw createSessionDisposedAbortError();
      }

      entry.resolvedValue = nextValue;
      return nextValue;
    })
    .catch((errorValue: unknown) => {
      if (pdfDocumentSessionRegistry.get(key) === entry) {
        pdfDocumentSessionRegistry.delete(key);
      }

      throw errorValue;
    });

  entry.documentPromise = nextDocumentPromise;
  void nextDocumentPromise.catch(() => {});

  return entry;
};

export const acquirePdfDocumentSession = (
  options: AcquirePdfDocumentSessionOptions,
): PdfDocumentSessionLease => {
  const sessionKey = buildPdfDocumentSessionKey(options);
  const existingEntry = pdfDocumentSessionRegistry.get(sessionKey);
  const entry =
    existingEntry && !existingEntry.disposed
      ? existingEntry
      : createPdfDocumentSessionEntry(options);

  if (!existingEntry || existingEntry.disposed) {
    pdfDocumentSessionRegistry.set(sessionKey, entry);
  }

  clearPendingDisposeTimer(entry);
  entry.referenceCount += 1;

  let released = false;

  return {
    sessionKey,
    documentPromise: entry.documentPromise,
    release: () => {
      if (released) {
        return;
      }

      released = true;
      entry.referenceCount = Math.max(0, entry.referenceCount - 1);

      if (entry.referenceCount === 0) {
        schedulePdfDocumentSessionDispose(entry);
      }
    },
  };
};

export const resetPdfDocumentSessionRegistryForTests = (): void => {
  const entries = Array.from(pdfDocumentSessionRegistry.values());

  pdfDocumentSessionRegistry.clear();

  entries.forEach((entry) => {
    disposePdfDocumentSessionEntry(entry);
  });
};
