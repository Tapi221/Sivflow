"use client";

import * as React from "react";

import { useBlockSelected } from "@platejs/selection/react";

import { getTableColumnCount } from "@platejs/table";

import { TablePlugin, TableProvider, useTableColSizes } from "@platejs/table/react";

import { blockSelectionVariants } from "./block-selection";

import { cn } from "@web-renderer/lib/utils";

import type { TTableCellElement, TTableElement, TTableRowElement } from "platejs";

import type { PlateElementProps } from "platejs/react";

import { PlateElement, useEditorRef } from "platejs/react";



type TableCellElementProps = PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
};



const TABLE_DEFAULT_COLUMN_WIDTH = 120;

const EMPTY_ELEMENT_PATH: number[] = [];



const getElementPath = (props: { path?: number[] }): number[] => {
  const path = props.path;
  return Array.isArray(path) ? path : EMPTY_ELEMENT_PATH;
};



const TableElementContent = ({ children, ...props }: PlateElementProps<TTableElement>) => {
  const { element } = props;
  const colSizes = useTableColSizes({ disableOverrides: true });
  const columnCount = Math.max(getTableColumnCount(element), colSizes.length, 1);
  const effectiveColSizes = React.useMemo(
    () => Array.from({ length: columnCount }, (_, index) => colSizes[index] ?? TABLE_DEFAULT_COLUMN_WIDTH),
    [colSizes, columnCount],
  );
  return (
    <PlateElement {...props} className="overflow-x-auto py-5">
      <div className="group/table relative w-fit">
        <table
          className="mr-0 ml-px table h-px table-fixed border-collapse"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <colgroup>
            {effectiveColSizes.map((width, index) => (
              <col key={index} style={{ width }} />
            ))}
          </colgroup>
          <tbody className="min-w-full">{children}</tbody>
        </table>
      </div>
    </PlateElement>
  );
};

const TableElement = (props: PlateElementProps<TTableElement>) => {
  return (
    <TableProvider>
      <TableElementContent {...props} />
    </TableProvider>
  );
};

const TableRowElement = (props: PlateElementProps<TTableRowElement>) => {
  return (
    <PlateElement {...props} as="tr" className="h-full">
      {props.children}
    </PlateElement>
  );
};

const TableCellElement = (props: TableCellElementProps) => {
  const { isHeader } = props;
  const editor = useEditorRef();
  const blockSelected = useBlockSelected();
  const path = getElementPath(props);
  const { element } = props;
  const { api } = editor.getPlugin(TablePlugin);
  const { minHeight, width } = api.table.getCellSize(props);
  const borders = api.table.getCellBorders({ element });
  const colSpan = api.table.getColSpan(element);
  const rowSpan = api.table.getRowSpan(element);
  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      attributes={{
        ...props.attributes,
        colSpan,
        rowSpan,
      }}
      className={cn(
        "relative h-full overflow-visible border-none bg-background p-0",
        element.background ? "bg-(--cellBackground)" : "bg-background",
        isHeader && "text-left font-normal *:m-0",
        "before:size-full",
        "before:absolute before:box-border before:select-none before:content-['']",
        borders &&
          cn(
            borders.bottom?.size && "before:border-b before:border-b-border",
            borders.right?.size && "before:border-r before:border-r-border",
            borders.left?.size && "before:border-l before:border-l-border",
            borders.top?.size && "before:border-t before:border-t-border",
          ),
      )}
      style={
        {
          "--cellBackground": element.background,
          maxWidth: width ?? 240,
          minWidth: width ?? 120,
        } as React.CSSProperties
      }
    >
      <div className="relative z-20 box-border h-full px-4 py-2" data-table-cell-path={path.join(".")} style={{ minHeight }}>
        {props.children}
        {blockSelected && <div className={blockSelectionVariants({ active: blockSelected })} contentEditable={false} />}
      </div>
    </PlateElement>
  );
};

const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return <TableCellElement {...props} isHeader />;
};



export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };



export type { TableCellElementProps };
