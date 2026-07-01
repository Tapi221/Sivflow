import { RUNTIME_CHUNK_ERROR_PATTERNS } from "@platform/runtime/runtime.constants";



const toErrorText = (input: unknown) => {
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
const isChunkLoadError = (input: unknown) => {
  const text = toErrorText(input);
  return RUNTIME_CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
};



export { toErrorText, isChunkLoadError };
