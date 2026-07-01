import { format } from "date-fns";



const toDateKey = (date: Date): string => {
  return format(date, "yyyy-MM-dd");
};



export { toDateKey };
