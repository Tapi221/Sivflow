import { toMillis } from "@/utils/toMillis";

export const getUpdatedAtMillis = (value: unknown): number => {
  return toMillis(value);
};
