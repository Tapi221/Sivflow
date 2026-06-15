type GoogleApiErrorPayload = {
  error?: {
    message?: string;
    errors?: Array<{ reason?: string; }>;
  };
};
type GoogleApiRetryContext = {
  service: "google_calendar" | "google_tasks";
  operation: string;
};
type GoogleApiErrorWithMetadata = Error & {
  googleReason?: string;
  retryAfterMs?: number;
  status?: number;
};



const GOOGLE_API_RETRY_DELAYS_MS = [500, 1_500, 4_000] as const;



const sleep = (ms: number): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, ms);
});
const parseRetryAfterMs = (value: string | null): number | undefined => {
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  const retryAt = Date.parse(value);
  if (!Number.isNaN(retryAt)) {
    return Math.max(0, retryAt - Date.now());
  }

  return undefined;
};
const createGoogleApiError = async (response: Response, prefix: string): Promise<GoogleApiErrorWithMetadata> => {
  const payload = await response.json().catch(() => null) as GoogleApiErrorPayload | null;
  const message = payload?.error?.message;
  const reason = payload?.error?.errors?.[0]?.reason;
  const error = new Error(
    message
      ? `${prefix} (${response.status}): ${message}`
      : `${prefix} (${response.status})`,
  ) as GoogleApiErrorWithMetadata;

  error.status = response.status;
  error.googleReason = reason;
  error.retryAfterMs = parseRetryAfterMs(response.headers.get("Retry-After"));
  return error;
};
const isRetryableGoogleApiError = (error: unknown): error is GoogleApiErrorWithMetadata => {
  if (!(error instanceof Error)) return false;
  const status = (error as GoogleApiErrorWithMetadata).status;
  return status === 429 || (typeof status === "number" && status >= 500 && status < 600);
};
const withGoogleApiRetry = async <T>(operation: () => Promise<T>, context: GoogleApiRetryContext): Promise<T> => {
  for (let attempt = 0; attempt <= GOOGLE_API_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isRetryableGoogleApiError(error) || attempt >= GOOGLE_API_RETRY_DELAYS_MS.length) {
        throw error;
      }

      const delayMs = (error.retryAfterMs ?? GOOGLE_API_RETRY_DELAYS_MS[attempt]);
      console.warn("[GoogleAPI] retrying transient failure", {
        attempt: attempt + 1,
        delayMs,
        googleReason: error.googleReason,
        operation: context.operation,
        service: context.service,
        status: error.status,
      });
      await sleep(delayMs);
    }
  }

  throw new Error("Google API retry loop exhausted");
};



export { createGoogleApiError, withGoogleApiRetry };
