"use client";

import * as React from "react";
import { TablePlugin } from "@platejs/table/react";
import type { TTableCellElement, TTableElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorPlugin } from "platejs/react";
import { cn } from "@/lib/utils";

type TableCellElementProps = PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
};

const TABLE_DEFAULT_CELL_WIDTH = 120;
const TABLE_DEFAULT_CELL_MAX_WIDTH = 240;

const TableElement = (props: PlateElementProps<TTableElement>) => {
  const { children, element } = props;
  const { getOptions } = useEditorPlugin(TablePlugin);
  const { disableMarginLeft } = getOptions();
  const marginLeft = disableMarginLeft ? 0 : element.marginLeft;

  return (
    <PlateElement {...props} className="overflow-x-auto py-5" style={{ paddingLeft: marginLeft }}>
      <div className="group/table relative w-fit">
        <table className="mr-0 ml-px table h-px table-fixed border-collapse" style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody className="min-w-full">{children}</tbody>
        </table>
      </div>
    </PlateElement>
  );
};
const TableRowElement = (props: PlateElementProps) => {
  return (
    <PlateElement {...props} as="tr" className="h-full">
      {props.children}
    </PlateElement>
  );
};
const TableCellElement = ({ isHeader = false, ...props }: TableCellElementProps) => {
  const { children, element } = props;
  const width = element.attributes?.colwidth?.[0] ?? TABLE_DEFAULT_CELL_WIDTH;

  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "h-full overflow-visible border border-border bg-background p-0",
        element.background ? "bg-(--cellBackground)" : "bg-background",
        isHeader && "text-left font-normal *:m-0",
      )}
      style={
        {
          "--cellBackground": element.background,
          maxWidth: width ?? TABLE_DEFAULT_CELL_MAX_WIDTH,
          minWidth: width ?? TABLE_DEFAULT_CELL_WIDTH,
        } as React.CSSProperties
      }
    >
      <div className="relative z-20 box-border h-full px-4 py-2">
        {children}
      </div>
    </PlateElement>
  );
};
const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return <TableCellElement {...props} isHeader />;
};

export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };
