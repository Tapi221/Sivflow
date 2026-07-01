import { toDateOrNull } from "@/utils/toMillis";



const normalizeDate = (value: unknown): Date | null => {
  return toDateOrNull(value);
};



export { normalizeDate };
