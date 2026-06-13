type TimestampFieldsLike = {
  seconds?: unknown;
  _seconds?: unknown;
  nanoseconds?: unknown;
  _nanoseconds?: unknown;
};
type TimestampMethodLike = {
  toDate?: () => unknown;
  toMillis?: () => unknown;
};
type TimestampLike = TimestampFieldsLike & TimestampMethodLike;



const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};
const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === "number" && Number.isFinite(value);
};
const isValidDate = (value: unknown): value is Date => {
  return value instanceof Date && Number.isFinite(value.getTime());
};
const normalizeEpochMillis = (value: number): number | null => {
  if (!Number.isFinite(value)) return null;

  const absolute = Math.abs(value);
  const epochMillis = absolute < 1e12 ? value * 1000 : value;

  if (!Number.isFinite(epochMillis)) return null;

  const normalized = Math.trunc(epochMillis);
  return Number.isFinite(normalized) ? normalized : null;
};
const toDateFromMillis = (value: number): Date | null => {
  const epochMillis = normalizeEpochMillis(value);
  if (epochMillis === null) return null;

  const date = new Date(epochMillis);
  return isValidDate(date) ? date : null;
};
const toDateFromNumericString = (value: string): Date | null => {
  if (!/^-?\d{10,13}$/.test(value)) return null;

  const numeric = Number(value);
  return toDateFromMillis(numeric);
};
const toDateFromString = (value: string): Date | null => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const numericDate = toDateFromNumericString(trimmed);
  if (numericDate) return numericDate;

  const parsed = new Date(trimmed);
  return isValidDate(parsed) ? parsed : null;
};
const toDateFromTimestampMethods = (value: TimestampLike): Date | null => {
  if (typeof value.toMillis === "function") {
    const millis = value.toMillis();
    if (isFiniteNumber(millis)) {
      return toDateFromMillis(millis);
    }
  }

  if (typeof value.toDate === "function") {
    const date = value.toDate();
    return isValidDate(date) ? new Date(date.getTime()) : null;
  }

  return null;
};
const toDateFromTimestampFields = (value: TimestampLike): Date | null => {
  const secondsCandidate = value.seconds ?? value._seconds ?? null;
  const nanosecondsRaw = value.nanoseconds ?? value._nanoseconds ?? 0;

  if (!isFiniteNumber(secondsCandidate)) return null;

  const seconds = secondsCandidate;
  const nanoseconds = isFiniteNumber(nanosecondsRaw) ? nanosecondsRaw : 0;
  const millis = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);

  return toDateFromMillis(millis);
};
const toDateOrNull = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (isValidDate(value)) {
    return new Date(value.getTime());
  }

  if (isFiniteNumber(value)) {
    return toDateFromMillis(value);
  }

  if (typeof value === "string") {
    return toDateFromString(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  const timestampValue = value as TimestampLike;

  return (
    toDateFromTimestampMethods(timestampValue) ??
    toDateFromTimestampFields(timestampValue)
  );
};
const toMillisOrNull = (value: unknown): number | null => {
  const date = toDateOrNull(value);
  return date ? date.getTime() : null;
};
const toMillis = (value: unknown, fallback = 0): number => {
  return toMillisOrNull(value) ?? fallback;
};
const toIsoStringOrNull = (value: unknown): string | null => {
  const date = toDateOrNull(value);
  return date ? date.toISOString() : null;
};



export { toDateOrNull, toMillisOrNull, toMillis, toIsoStringOrNull };
