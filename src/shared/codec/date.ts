import { toDateOrNull } from "@/utils/toMillis";

export const normalizeDate = (value: unknown): Date | null => {
  return toDateOrNull(value);
};
