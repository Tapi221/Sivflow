import type { SlateElementProps } from "platejs/static";
import { SlateElement } from "platejs/static";
import { cn } from "@/lib/utils";

type TableNodeStaticProps = SlateElementProps;

const TableNodeStatic = ({ className, children, ...props }: TableNodeStaticProps) => (
  <SlateElement className={cn("my-4 overflow-x-auto", className)} {...props}>
    <table className="w-full border-collapse border border-border text-sm">{children}</table>
  </SlateElement>
);
const TableRowNodeStatic = ({ className, children, ...props }: SlateElementProps) => (
  <SlateElement as="tr" className={cn("border-border", className)} {...props}>
    {children}
  </SlateElement>
);
const TableCellNodeStatic = ({ className, children, ...props }: SlateElementProps) => (
  <SlateElement as="td" className={cn("border border-border px-3 py-2 align-top", className)} {...props}>
    {children}
  </SlateElement>
);
const TableCellHeaderStatic = ({ className, children, ...props }: SlateElementProps) => (
  <SlateElement
    as="th"
    className={cn("border border-border bg-muted px-3 py-2 text-left align-top font-medium", className)}
    {...props}
  >
    {children}
  </SlateElement>
);

const TableElementStatic = TableNodeStatic;
const TableRowElementStatic = TableRowNodeStatic;
const TableCellElementStatic = TableCellNodeStatic;
const TableCellHeaderElementStatic = TableCellHeaderStatic;

export { TableCellElementStatic, TableCellHeaderElementStatic, TableCellHeaderStatic, TableCellNodeStatic, TableElementStatic, TableNodeStatic, TableRowElementStatic, TableRowNodeStatic };
export type { TableNodeStaticProps };
