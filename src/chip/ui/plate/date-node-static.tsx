import { PlateElement } from "platejs/react";
import type { PlateElementProps } from "platejs/react";
import { cn } from "@/lib/utils";

type DateNodeStaticProps = PlateElementProps & {
  date?: string;
};

const DateNodeStatic = ({ className, date, children, ...props }: DateNodeStaticProps) => (
  <PlateElement className={cn("inline-flex rounded-sm bg-muted px-1 text-sm text-muted-foreground", className)} {...props}>
    {date ?? children}
  </PlateElement>
);

const DateElementStatic = DateNodeStatic;

export { DateElementStatic, DateNodeStatic };
export type { DateNodeStaticProps };
