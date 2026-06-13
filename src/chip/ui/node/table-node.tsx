"use client";

import * as React from "react";
import { setTableColSize, setTableMarginLeft, setTableRowSize } from "@platejs/table";
import { TablePlugin } from "@platejs/table/react";
import type { Path, TTableCellElement, TTableElement, TTableRowElement } from "platejs";
import type { PlateEditor, PlateElementProps } from "platejs/react";
import { PlateElement, useEditorPlugin } from "platejs/react";
import { cn } from "@/lib/utils";

type TableCellElementProps = PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
};
type TableCellElementWithAttributes = TTableCellElement & {
  attributes?: {
    colspan?: number;
    colwidth?: number[];
    rowspan?: number;
  };
};
type TableResizeDirection = "bottom" | "left" | "right";
type TableResizeSession = {
  colIndex: number;
  direction: TableResizeDirection;
  frameId: number | null;
  initialMarginLeft: number;
  initialNextWidth: number | null;
  initialPosition: number;
  initialSize: number;
  rowIndex: number;
  tablePath: Path;
};
type TableResizeHandleProps = {
  colIndex: number;
  direction: TableResizeDirection;
  editor: PlateEditor;
  marginLeft: number;
  minColumnWidth: number;
  nextWidth: number | null;
  rowIndex: number;
  tablePath: Path;
  width: number;
};
type TableCellMetrics = {
  colIndex: number;
  colSpan: number;
  marginLeft: number;
  minHeight: number;
  nextWidth: number | null;
  rowIndex: number;
  rowSpan: number;
  tablePath: Path | null;
  width: number;
};

const TABLE_DEFAULT_CELL_WIDTH = 120;
const TABLE_MIN_CELL_WIDTH = 48;

const getTablePathFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length < 3) return null;
  return cellPath.slice(0, -2);
};
const getRowPathFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length < 2) return null;
  return cellPath.slice(0, -1);
};
const getColumnIndexFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length === 0) return 0;
  return cellPath[cellPath.length - 1] ?? 0;
};
const getRowIndexFromCellPath = (cellPath: Path | undefined) => {
  if (!cellPath || cellPath.length < 2) return 0;
  return cellPath[cellPath.length - 2] ?? 0;
};
const getCellAttributes = (element: TTableCellElement) => (element as TableCellElementWithAttributes).attributes;
const getCellColSpan = (element: TTableCellElement) => getCellAttributes(element)?.colspan ?? 1;
const getCellRowSpan = (element: TTableCellElement) => getCellAttributes(element)?.rowspan ?? 1;
const getCellWidthFromAttributes = (element: TTableCellElement) => getCellAttributes(element)?.colwidth?.[0];
const clampColumnWidth = (width: number, minColumnWidth: number) => Math.max(Math.round(width), Math.max(minColumnWidth, TABLE_MIN_CELL_WIDTH));
const clampRowHeight = (height: number) => Math.max(Math.round(height), 24);
const getTableEntry = (editor: PlateEditor, tablePath: Path | null) => {
  if (!tablePath) return null;
  return editor.api.node<TTableElement>(tablePath) ?? null;
};
const getTableColSizes = (editor: PlateEditor, tablePath: Path | null) => getTableEntry(editor, tablePath)?.[0].colSizes ?? [];
const getTableMarginLeft = (editor: PlateEditor, tablePath: Path | null) => getTableEntry(editor, tablePath)?.[0].marginLeft ?? 0;
const getRowSize = (editor: PlateEditor, rowPath: Path | null) => {
  if (!rowPath) return 0;
  const rowEntry = editor.api.node<TTableRowElement>(rowPath);
  return rowEntry?.[0].size ?? 0;
};
const getCellMetrics = (editor: PlateEditor, element: TTableCellElement): TableCellMetrics => {
  const cellPath = editor.api.findPath(element);
  const tablePath = getTablePathFromCellPath(cellPath);
  const rowPath = getRowPathFromCellPath(cellPath);
  const colIndex = getColumnIndexFromCellPath(cellPath);
  const rowIndex = getRowIndexFromCellPath(cellPath);
  const colSpan = getCellColSpan(element);
  const rowSpan = getCellRowSpan(element);
  const colSizes = getTableColSizes(editor, tablePath);
  const attributeWidth = getCellWidthFromAttributes(element);
  const width = colSizes.length > 0 ? colSizes.slice(colIndex, colIndex + colSpan).reduce((total, colSize) => total + (colSize || TABLE_DEFAULT_CELL_WIDTH), 0) : attributeWidth ?? TABLE_DEFAULT_CELL_WIDTH;
  const marginLeft = getTableMarginLeft(editor, tablePath);
  const nextWidth = colSizes[colIndex + colSpan] ?? null;
  const minHeight = getRowSize(editor, rowPath);
  return {
    colIndex,
    colSpan,
    marginLeft,
    minHeight,
    nextWidth,
    rowIndex,
    rowSpan,
    tablePath,
    width,
  };
};
const resizeTableColumn = (editor: PlateEditor, session: TableResizeSession, currentPosition: number, minColumnWidth: number) => {
  if (session.direction === "left") {
    const delta = currentPosition - session.initialPosition;
    const maxMarginLeft = session.initialMarginLeft + session.initialSize - minColumnWidth;
    const nextMarginLeft = Math.min(Math.max(session.initialMarginLeft + delta, 0), maxMarginLeft);
    const nextWidth = clampColumnWidth(session.initialSize + session.initialMarginLeft - nextMarginLeft, minColumnWidth);
    setTableMarginLeft(editor, { marginLeft: nextMarginLeft }, { at: session.tablePath });
    setTableColSize(editor, { colIndex: session.colIndex, width: nextWidth }, { at: session.tablePath });
    return;
  }
  if (session.direction === "right") {
    const delta = currentPosition - session.initialPosition;
    const nextWidth = clampColumnWidth(session.initialSize + delta, minColumnWidth);
    setTableColSize(editor, { colIndex: session.colIndex, width: nextWidth }, { at: session.tablePath });
    if (session.initialNextWidth !== null) {
      const neighborWidth = clampColumnWidth(session.initialNextWidth - (nextWidth - session.initialSize), minColumnWidth);
      setTableColSize(editor, { colIndex: session.colIndex + 1, width: neighborWidth }, { at: session.tablePath });
    }
  }
};
const resizeTableRow = (editor: PlateEditor, session: TableResizeSession, currentPosition: number) => {
  const delta = currentPosition - session.initialPosition;
  const nextHeight = clampRowHeight(session.initialSize + delta);
  setTableRowSize(editor, { height: nextHeight, rowIndex: session.rowIndex }, { at: session.tablePath });
};
const getResizePosition = (event: PointerEvent | React.PointerEvent<HTMLDivElement>, direction: TableResizeDirection) => direction === "bottom" ? event.clientY : event.clientX;

const TableResizeHandle = ({ colIndex, direction, editor, marginLeft, minColumnWidth, nextWidth, rowIndex, tablePath, width }: TableResizeHandleProps) => {
  const resizeSessionRef = React.useRef<TableResizeSession | null>(null);
  const [isResizing, setIsResizing] = React.useState(false);
  const applyResize = React.useCallback((position: number) => {
    const session = resizeSessionRef.current;
    if (!session) return;
    if (session.direction === "bottom") {
      resizeTableRow(editor, session, position);
      return;
    }
    resizeTableColumn(editor, session, position, minColumnWidth);
  }, [editor, minColumnWidth]);
  const startResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSessionRef.current = {
      colIndex,
      direction,
      frameId: null,
      initialMarginLeft: marginLeft,
      initialNextWidth: nextWidth,
      initialPosition: getResizePosition(event, direction),
      initialSize: width,
      rowIndex,
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
      const position = getResizePosition(moveEvent, session.direction);
      session.frameId = window.requestAnimationFrame(() => {
        session.frameId = null;
        applyResize(position);
      });
    };
    const stopResize = (stopEvent: PointerEvent) => {
      stopEvent.preventDefault();
      const session = resizeSessionRef.current;
      if (session?.frameId !== null && session?.frameId !== undefined) {
        window.cancelAnimationFrame(session.frameId);
      }
      if (session) {
        applyResize(getResizePosition(stopEvent, session.direction));
      }
      resizeSessionRef.current = null;
      setIsResizing(false);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }, [applyResize, colIndex, direction, marginLeft, nextWidth, rowIndex, tablePath, width]);
  React.useEffect(() => () => {
    const session = resizeSessionRef.current;
    if (session?.frameId !== null && session?.frameId !== undefined) {
      window.cancelAnimationFrame(session.frameId);
    }
  }, []);
  return (
    <div
      aria-hidden="true"
      className={cn(
        "absolute z-40 touch-none select-none opacity-0 transition-opacity group-hover/cell:opacity-100 data-[resizing=true]:opacity-100",
        direction === "bottom" ? "right-0 -bottom-1 h-2 w-full cursor-row-resize" : "top-0 h-full w-2 cursor-col-resize",
        direction === "left" && "-left-1",
        direction === "right" && "-right-1",
      )}
      contentEditable={false}
      data-resizing={isResizing}
      onPointerDown={startResize}
    >
      <div
        className={cn(
          "absolute bg-ring",
          direction === "bottom" ? "right-0 bottom-1 h-px w-full" : "top-0 h-full w-px",
          direction === "left" && "left-1",
          direction === "right" && "right-1",
        )}
      />
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
  const { disableMarginLeft = false, minColumnWidth = TABLE_MIN_CELL_WIDTH } = getOptions();
  const metrics = getCellMetrics(editor, element);
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
          maxWidth: metrics.width,
          minWidth: metrics.width,
        } as React.CSSProperties
      }
      attributes={{
        ...props.attributes,
        colSpan: metrics.colSpan,
        rowSpan: metrics.rowSpan,
      }}
    >
      <div className="relative z-20 box-border h-full px-4 py-2" style={{ minHeight: metrics.minHeight || undefined }}>
        {children}
      </div>
      {metrics.tablePath && metrics.colIndex === 0 && !disableMarginLeft && <TableResizeHandle colIndex={metrics.colIndex} direction="left" editor={editor} marginLeft={metrics.marginLeft} minColumnWidth={minColumnWidth} nextWidth={metrics.nextWidth} rowIndex={metrics.rowIndex} tablePath={metrics.tablePath} width={metrics.width} />}
      {metrics.tablePath && <TableResizeHandle colIndex={metrics.colIndex} direction="right" editor={editor} marginLeft={metrics.marginLeft} minColumnWidth={minColumnWidth} nextWidth={metrics.nextWidth} rowIndex={metrics.rowIndex} tablePath={metrics.tablePath} width={metrics.width} />}
      {metrics.tablePath && <TableResizeHandle colIndex={metrics.colIndex} direction="bottom" editor={editor} marginLeft={metrics.marginLeft} minColumnWidth={minColumnWidth} nextWidth={metrics.nextWidth} rowIndex={metrics.rowIndex} tablePath={metrics.tablePath} width={metrics.minHeight ?? 24} />}
    </PlateElement>
  );
};
const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return <TableCellElement {...props} isHeader />;
};

export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };
