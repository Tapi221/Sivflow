import { format } from "date-fns";

export const toDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};
