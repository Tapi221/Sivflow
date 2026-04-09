import { asRecord } from "@/shared/lib/records";

const normalizeEpochNumber = (value: number): Date | null => {
  if (!Number.isFinite(value)) return null;

  const absolute = Math.abs(value);
  const epochMillis = absolute < 1e12 ? value * 1000 : value;
  const date = new Date(epochMillis);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const normalizeDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;

  const record = asRecord(value);
  if (record && typeof record.toDate === "function") {
    const date = (record.toDate as () => unknown)();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (record) {
    const seconds =
      typeof record.seconds === "number"
        ? record.seconds
        : typeof record._seconds === "number"
          ? record._seconds
          : null;
    const nanoseconds =
      typeof record.nanoseconds === "number"
        ? record.nanoseconds
        : typeof record._nanoseconds === "number"
          ? record._nanoseconds
          : 0;

    if (seconds !== null) {
      const millis = seconds * 1000 + Math.floor(nanoseconds / 1_000_000);
      const date = new Date(millis);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  if (typeof value === "number") {
    return normalizeEpochNumber(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (/^-?\d{10,13}$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return normalizeEpochNumber(numeric);
    }

    const direct = new Date(trimmed);
    if (!Number.isNaN(direct.getTime())) return direct;
  }

  return null;
};
