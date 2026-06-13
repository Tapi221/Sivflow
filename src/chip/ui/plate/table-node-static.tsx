import type { PlateElementProps } from "platejs/react";
import { PlateElement } from "platejs/react";
import { cn } from "@/lib/utils";

type TableNodeStaticProps = PlateElementProps;

const TableNodeStatic = ({ className, children, ...props }: TableNodeStaticProps) => (
  <PlateElement className={cn("my-4 overflow-x-auto", className)} {...props}>
    <table className="w-full border-collapse border border-border text-sm">{children}</table>
  </PlateElement>
);
const TableRowNodeStatic = ({ className, children, ...props }: PlateElementProps) => (
  <PlateElement as="tr" className={cn("border-border", className)} {...props}>
    {children}
  </PlateElement>
);
const TableCellNodeStatic = ({ className, children, ...props }: PlateElementProps) => (
  <PlateElement as="td" className={cn("border border-border px-3 py-2 align-top", className)} {...props}>
    {children}
  </PlateElement>
);
const TableCellHeaderStatic = ({ className, children, ...props }: PlateElementProps) => (
  <PlateElement
    as="th"
    className={cn("border border-border bg-muted px-3 py-2 text-left align-top font-medium", className)}
    {...props}
  >
    {children}
  </PlateElement>
);

const TableElementStatic = TableNodeStatic;
const TableRowElementStatic = TableRowNodeStatic;
const TableCellElementStatic = TableCellNodeStatic;
const TableCellHeaderElementStatic = TableCellHeaderStatic;

export { TableCellElementStatic, TableCellHeaderElementStatic, TableCellHeaderStatic, TableCellNodeStatic, TableElementStatic, TableNodeStatic, TableRowElementStatic, TableRowNodeStatic };
export type { TableNodeStaticProps };
