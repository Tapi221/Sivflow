export interface PdfThumbnailRenderQueueTask<T> {
  priority?: number;
  run: () => Promise<T> | T;
}

export interface PdfThumbnailQueuedRender<T> {
  promise: Promise<T>;
  cancel: () => void;
}

interface PdfThumbnailQueuedRenderEntry<T> {
  id: number;
  priority: number;
  sequence: number;
  cancelled: boolean;
  started: boolean;
  run: () => Promise<T> | T;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

const DEFAULT_MAX_CONCURRENT_THUMBNAIL_RENDERS = 2;
const MIN_MAX_CONCURRENT_THUMBNAIL_RENDERS = 1;
const MAX_MAX_CONCURRENT_THUMBNAIL_RENDERS = 4;

let maxConcurrentThumbnailRenders = DEFAULT_MAX_CONCURRENT_THUMBNAIL_RENDERS;
let activeRenderCount = 0;
let nextQueueId = 1;
let nextSequence = 1;
const queuedRenderEntries: Array<PdfThumbnailQueuedRenderEntry<unknown>> = [];

export class PdfThumbnailRenderCancelledError extends Error {
  constructor() {
    super("PDF thumbnail render was cancelled before it started");
    this.name = "PdfThumbnailRenderCancelledError";
  }
}

export const isPdfThumbnailRenderCancelledError = (value: unknown) => {
  return value instanceof PdfThumbnailRenderCancelledError;
};

const clampMaxConcurrentRenders = (value: number) => {
  if (!Number.isFinite(value)) {
    return DEFAULT_MAX_CONCURRENT_THUMBNAIL_RENDERS;
  }

  return Math.min(
    MAX_MAX_CONCURRENT_THUMBNAIL_RENDERS,
    Math.max(MIN_MAX_CONCURRENT_THUMBNAIL_RENDERS, Math.trunc(value)),
  );
};

const sortQueuedRenderEntries = () => {
  queuedRenderEntries.sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return left.sequence - right.sequence;
  });
};

const rejectCancelledPendingEntries = () => {
  for (let index = queuedRenderEntries.length - 1; index >= 0; index -= 1) {
    const entry = queuedRenderEntries[index];
    if (!entry?.cancelled) {
      continue;
    }

    queuedRenderEntries.splice(index, 1);
    entry.reject(new PdfThumbnailRenderCancelledError());
  }
};

const pumpPdfThumbnailRenderQueue = () => {
  rejectCancelledPendingEntries();
  sortQueuedRenderEntries();

  while (
    activeRenderCount < maxConcurrentThumbnailRenders &&
    queuedRenderEntries.length > 0
  ) {
    const entry = queuedRenderEntries.shift();
    if (!entry || entry.cancelled) {
      entry?.reject(new PdfThumbnailRenderCancelledError());
      continue;
    }

    entry.started = true;
    activeRenderCount += 1;

    Promise.resolve()
      .then(entry.run)
      .then(entry.resolve, entry.reject)
      .finally(() => {
        activeRenderCount = Math.max(0, activeRenderCount - 1);
        pumpPdfThumbnailRenderQueue();
      });
  }
};

export const schedulePdfThumbnailRender = <T>({
  priority = 0,
  run,
}: PdfThumbnailRenderQueueTask<T>): PdfThumbnailQueuedRender<T> => {
  const id = nextQueueId;
  nextQueueId += 1;

  let entry: PdfThumbnailQueuedRenderEntry<T> | null = null;

  const promise = new Promise<T>((resolve, reject) => {
    entry = {
      id,
      priority: Number.isFinite(priority) ? priority : 0,
      sequence: nextSequence,
      cancelled: false,
      started: false,
      run,
      resolve,
      reject,
    };

    nextSequence += 1;
    queuedRenderEntries.push(entry as PdfThumbnailQueuedRenderEntry<unknown>);
  });

  pumpPdfThumbnailRenderQueue();

  return {
    promise,
    cancel: () => {
      if (!entry || entry.started || entry.cancelled) {
        return;
      }

      entry.cancelled = true;
      pumpPdfThumbnailRenderQueue();
    },
  };
};

export const getPdfThumbnailRenderQueueSnapshot = () => {
  return {
    activeRenderCount,
    pendingRenderCount: queuedRenderEntries.length,
    maxConcurrentThumbnailRenders,
  };
};

export const configurePdfThumbnailRenderQueueForTests = (
  nextMaxConcurrentThumbnailRenders: number,
) => {
  const previousMaxConcurrentThumbnailRenders = maxConcurrentThumbnailRenders;
  maxConcurrentThumbnailRenders = clampMaxConcurrentRenders(
    nextMaxConcurrentThumbnailRenders,
  );
  pumpPdfThumbnailRenderQueue();

  return () => {
    maxConcurrentThumbnailRenders = previousMaxConcurrentThumbnailRenders;
    pumpPdfThumbnailRenderQueue();
  };
};

export const clearPdfThumbnailRenderQueueForTests = () => {
  queuedRenderEntries.splice(0).forEach((entry) => {
    entry.cancelled = true;
    entry.reject(new PdfThumbnailRenderCancelledError());
  });
};
