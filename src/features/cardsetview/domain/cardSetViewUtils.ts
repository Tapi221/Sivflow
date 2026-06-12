import { toMillisOrNull } from "@/utils/toMillis";



const toTimeMs = (value: unknown): number | null => {
  return toMillisOrNull(value);
};



export { toTimeMs };
