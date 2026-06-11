import { toMillis } from "@/utils/toMillis";



const getUpdatedAtMillis = (value: unknown): number => {
  return toMillis(value);
};



export { getUpdatedAtMillis };
