export interface PdfThumbnailRenderQueueTask<T> {
  priority?: number;
  run: () => Promise<T> | T;
}

export interface PdfThumbnailQueuedRender<T> {
  promise: Promise<T>;
  cancel: () => void;
}

export interface CancelPendingPdfThumbnailRendersOptions {
  maxPriority?: number;
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
const HIGH_PRIORITY_PARALLEL_RENDER_THRESHOLD = 900;

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

const normalizePriority = (value: number | undefined) => {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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

const canStartQueuedEntry = (entry: PdfThumbnailQueuedRenderEntry<unknown>) => {
  if (activeRenderCount >= maxConcurrentThumbnailRenders) {
    return false;
  }

  if (activeRenderCount === 0) {
    return true;
  }

  return entry.priority >= HIGH_PRIORITY_PARALLEL_RENDER_THRESHOLD;
};

const findNextStartableEntryIndex = () => {
  return queuedRenderEntries.findIndex((entry) => canStartQueuedEntry(entry));
};

const pumpPdfThumbnailRenderQueue = () => {
  rejectCancelledPendingEntries();
  sortQueuedRenderEntries();

  while (
    activeRenderCount < maxConcurrentThumbnailRenders &&
    queuedRenderEntries.length > 0
  ) {
    const nextEntryIndex = findNextStartableEntryIndex();
    if (nextEntryIndex < 0) {
      return;
    }

    const [entry] = queuedRenderEntries.splice(nextEntryIndex, 1);
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
      priority: normalizePriority(priority),
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

export const cancelPendingPdfThumbnailRenders = ({
  maxPriority = Number.POSITIVE_INFINITY,
}: CancelPendingPdfThumbnailRendersOptions = {}) => {
  const normalizedMaxPriority = Number.isFinite(maxPriority)
    ? maxPriority
    : Number.POSITIVE_INFINITY;
  let cancelledCount = 0;

  queuedRenderEntries.forEach((entry) => {
    if (entry.started || entry.cancelled || entry.priority > normalizedMaxPriority) {
      return;
    }

    entry.cancelled = true;
    cancelledCount += 1;
  });

  if (cancelledCount > 0) {
    pumpPdfThumbnailRenderQueue();
  }

  return cancelledCount;
};

export const getPdfThumbnailRenderQueueSnapshot = () => {
  return {
    activeRenderCount,
    pendingRenderCount: queuedRenderEntries.length,
    maxConcurrentThumbnailRenders,
    highPriorityParallelRenderThreshold: HIGH_PRIORITY_PARALLEL_RENDER_THRESHOLD,
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
