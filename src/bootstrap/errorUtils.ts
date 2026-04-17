import { CHUNK_ERROR_PATTERNS } from "@constants/shared/app";

export const toErrorText = (input: unknown) => {
  if (typeof input === "string") return input;
  if (input instanceof Error) return `${input.name}: ${input.message}`;
  if (input && typeof input === "object") {
    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }
  return String(input ?? "");
};

export const isChunkLoadError = (input: unknown) => {
  const text = toErrorText(input);
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
};
