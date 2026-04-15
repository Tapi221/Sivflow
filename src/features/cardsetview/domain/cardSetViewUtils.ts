import { toMillisOrNull } from "@/utils/toMillis";

export const toTimeMs = (value: unknown): number | null => {
  return toMillisOrNull(value);
};
