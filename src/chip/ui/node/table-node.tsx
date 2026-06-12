"use client";

import * as React from "react";
import { setTableColSize } from "@platejs/table";
import { TablePlugin } from "@platejs/table/react";
import type { Path, TTableCellElement, TTableElement } from "platejs";
import type { PlateEditor, PlateElementProps } from "platejs/react";
import { PlateElement, useEditorPlugin } from "platejs/react";
import { cn } from "@/lib/utils";

type TableCellElementProps = PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
};
type TableCellElementWithAttributes = TTableCellElement & {
  attributes?: {
    colwidth?: number[];
  };
};
type TableColumnResizeSession = {
  colIndex: number;
  frameId: number | null;
  startWidth: number;
  startX: number;
  tablePath: Path;
};
type TableColumnResizeHandleProps = {
  colIndex: number;
  editor: PlateEditor;
  minColumnWidth: number;
  tablePath: Path;
  width: number;
};

const TABLE_DEFAULT_CELL_WIDTH = 120;
const TABLE_MIN_CELL_WIDTH = 48;

const getTablePathFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length < 3) return null;
  return cellPath.slice(0, -2);
};
const getColumnIndexFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length === 0) return 0;
  return cellPath[cellPath.length - 1] ?? 0;
};
const getCellWidth = (element: TTableCellElement) => {
  const cellElement = element as TableCellElementWithAttributes;
  return cellElement.attributes?.colwidth?.[0] ?? TABLE_DEFAULT_CELL_WIDTH;
};
const clampColumnWidth = (width: number, minColumnWidth: number) => Math.max(Math.round(width), Math.max(minColumnWidth, TABLE_MIN_CELL_WIDTH));

const TableColumnResizeHandle = ({ colIndex, editor, minColumnWidth, tablePath, width }: TableColumnResizeHandleProps) => {
  const resizeSessionRef = React.useRef<TableColumnResizeSession | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const commitColumnWidth = React.useCallback((clientX: number) => {
    const session = resizeSessionRef.current;
    if (!session) return;
    const nextWidth = clampColumnWidth(session.startWidth + clientX - session.startX, minColumnWidth);
    setTableColSize(editor, { colIndex: session.colIndex, width: nextWidth }, { at: session.tablePath });
  }, [editor, minColumnWidth]);
  const startColumnResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSessionRef.current = {
      colIndex,
      frameId: null,
      startWidth: width,
      startX: event.clientX,
      tablePath,
    };
    setIsResizing(true);
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      const session = resizeSessionRef.current;
      if (!session) return;
      if (session.frameId !== null) {
        window.cancelAnimationFrame(session.frameId);
      }
      const clientX = moveEvent.clientX;
      session.frameId = window.requestAnimationFrame(() => {
        session.frameId = null;
        commitColumnWidth(clientX);
      });
    };
    const stopColumnResize = (stopEvent: PointerEvent) => {
      stopEvent.preventDefault();
      const session = resizeSessionRef.current;
      if (session?.frameId !== null && session?.frameId !== undefined) {
        window.cancelAnimationFrame(session.frameId);
      }
      commitColumnWidth(stopEvent.clientX);
      resizeSessionRef.current = null;
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopColumnResize);
      window.removeEventListener("pointercancel", stopColumnResize);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopColumnResize);
    window.addEventListener("pointercancel", stopColumnResize);
  }, [colIndex, commitColumnWidth, tablePath, width]);
  React.useEffect(() => () => {
    const session = resizeSessionRef.current;
    if (session?.frameId !== null && session?.frameId !== undefined) {
      window.cancelAnimationFrame(session.frameId);
    }
  }, []);
  return (
    <div
      aria-hidden="true"
      className="absolute top-0 -right-1 z-40 h-full w-2 cursor-col-resize touch-none select-none opacity-0 transition-opacity group-hover/cell:opacity-100 data-[resizing=true]:opacity-100"
      contentEditable={false}
      data-resizing={isResizing}
      onPointerDown={startColumnResize}
    >
      <div className="absolute top-0 right-1 h-full w-px bg-ring" />
    </div>
  );
};
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
  const { editor, getOptions } = useEditorPlugin(TablePlugin);
  const { minColumnWidth = TABLE_MIN_CELL_WIDTH } = getOptions();
  const cellPath = editor.api.findPath(element);
  const tablePath = getTablePathFromCellPath(cellPath);
  const colIndex = getColumnIndexFromCellPath(cellPath);
  const width = getCellWidth(element);
  return (
    <PlateElement
      {...props}
      as={isHeader ? "th" : "td"}
      className={cn(
        "group/cell relative h-full overflow-visible border border-[var(--card-border-default)] bg-background p-0",
        element.background ? "bg-(--cellBackground)" : "bg-background",
        isHeader && "text-left font-normal *:m-0",
      )}
      style={
        {
          "--cellBackground": element.background,
          maxWidth: width,
          minWidth: width,
        } as React.CSSProperties
      }
    >
      <div className="relative z-20 box-border h-full px-4 py-2">
        {children}
      </div>
      {tablePath && <TableColumnResizeHandle colIndex={colIndex} editor={editor} minColumnWidth={minColumnWidth} tablePath={tablePath} width={width} />}
    </PlateElement>
  );
};
const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return <TableCellElement {...props} isHeader />;
};

export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };
