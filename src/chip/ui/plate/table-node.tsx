"use client";
import * as React from "react";
import { resizeLengthClampStatic } from "@platejs/resizable";
import { useBlockSelected } from "@platejs/selection/react";
import { getTableColumnCount, setCellBackground, setTableColSize, setTableRowSize } from "@platejs/table";
import { TablePlugin, roundCellSizeToStep, useOverrideColSize, useOverrideRowSize, useTableColSizes, useTableMergeState } from "@platejs/table/react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CombineIcon, EraserIcon, Grid2X2Icon, PaintBucketIcon, SquareSplitHorizontalIcon, Trash2Icon, XIcon } from "lucide-react";
import type { TTableCellElement, TTableElement, TTableRowElement } from "platejs";
import type { PlateElementProps } from "platejs/react";
import { PlateElement, useEditorPlugin, useEditorRef, useFocusedLast, useReadOnly, useSelected } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/chip/ui/popover";
import { blockSelectionVariants } from "@/chip/ui/plate/block-selection";
import { ColorDropdownMenuItems, DEFAULT_COLORS } from "@/chip/ui/plate/font-color-toolbar-button";
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarMenuGroup } from "@/chip/ui/plate/toolbar";
import { cn } from "@/lib/utils";

type TableResizeDirection = "bottom" | "right";
type TableResizeStartOptions = {
  colIndex: number;
  direction: TableResizeDirection;
  handleKey: string;
  rowIndex: number;
};
type TableResizeDragState = {
  colIndex: number;
  direction: TableResizeDirection;
  initialPosition: number;
  initialSize: number;
  rowIndex: number;
};
type TableResizeContextValue = {
  clearResizePreview: (handleKey: string) => void;
  setResizePreview: (event: React.PointerEvent<HTMLDivElement>, options: TableResizeStartOptions) => void;
  startResize: (event: React.PointerEvent<HTMLDivElement>, options: TableResizeStartOptions) => void;
};
type TableResizeControllerOptions = {
  dragIndicatorRef: React.RefObject<HTMLDivElement | null>;
  effectiveColSizes: number[];
  hoverIndicatorRef: React.RefObject<HTMLDivElement | null>;
  tablePath: number[];
  tableRef: React.RefObject<HTMLTableElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
};
type TableCellElementProps = PlateElementProps<TTableCellElement> & {
  isHeader?: boolean;
};
type TableActionButtonProps = {
  children: React.ReactNode;
  disabled?: boolean;
  onAction: () => void;
  tooltip: string;
};

const TABLE_DEFAULT_COLUMN_WIDTH = 120;
const TABLE_MIN_ROW_HEIGHT = 34;
const TableResizeContext = React.createContext<TableResizeContextValue | null>(null);

const getElementPath = (props: PlateElementProps): number[] => {
  const path = (props as { path?: number[] }).path;
  return Array.isArray(path) ? path : [];
};
const getCellIndicesFromPath = (path: number[]) => {
  const colIndex = path.length > 0 ? path[path.length - 1] : 0;
  const rowIndex = path.length > 1 ? path[path.length - 2] : 0;
  return { colIndex, rowIndex };
};
const useTableResizeContext = () => {
  const context = React.useContext(TableResizeContext);
  if (!context) {
    throw new Error("TableResizeContext is missing");
  }
  return context;
};
const useTableResizeController = ({ dragIndicatorRef, effectiveColSizes, hoverIndicatorRef, tablePath, tableRef, wrapperRef }: TableResizeControllerOptions): TableResizeContextValue => {
  const { editor, getOptions } = useEditorPlugin(TablePlugin);
  const { minColumnWidth = 0 } = getOptions();
  const effectiveColSizesRef = React.useRef(effectiveColSizes);
  const activeHandleKeyRef = React.useRef<string | null>(null);
  const cleanupListenersRef = React.useRef<(() => void) | null>(null);
  const dragStateRef = React.useRef<TableResizeDragState | null>(null);
  const previewHandleKeyRef = React.useRef<string | null>(null);
  const overrideColSize = useOverrideColSize();
  const overrideRowSize = useOverrideRowSize();
  React.useEffect(() => {
    effectiveColSizesRef.current = effectiveColSizes;
  }, [effectiveColSizes]);
  const hideIndicator = React.useCallback((indicatorRef: React.RefObject<HTMLDivElement | null>) => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    indicator.style.display = "none";
    indicator.style.removeProperty("left");
    indicator.style.removeProperty("top");
    indicator.style.removeProperty("height");
    indicator.style.removeProperty("width");
  }, []);
  const showColumnIndicator = React.useCallback((indicatorRef: React.RefObject<HTMLDivElement | null>, offset: number) => {
    const indicator = indicatorRef.current;
    const wrapper = wrapperRef.current;
    if (!indicator || !wrapper) return;
    indicator.style.display = "block";
    indicator.style.left = `${offset}px`;
    indicator.style.top = "0";
    indicator.style.height = `${wrapper.getBoundingClientRect().height}px`;
    indicator.style.width = "2px";
  }, [wrapperRef]);
  const showRowIndicator = React.useCallback((indicatorRef: React.RefObject<HTMLDivElement | null>, offset: number) => {
    const indicator = indicatorRef.current;
    const wrapper = wrapperRef.current;
    if (!indicator || !wrapper) return;
    indicator.style.display = "block";
    indicator.style.left = "0";
    indicator.style.top = `${offset}px`;
    indicator.style.height = "2px";
    indicator.style.width = `${wrapper.getBoundingClientRect().width}px`;
  }, [wrapperRef]);
  const getColumnBoundaryOffset = React.useCallback((colIndex: number, currentWidth: number) => effectiveColSizesRef.current.slice(0, colIndex).reduce((total, colSize) => total + colSize, 0) + currentWidth, []);
  const getRowBoundaryOffset = React.useCallback((rowIndex: number, currentHeight: number) => {
    const table = tableRef.current;
    if (!table) return currentHeight;
    const rows = Array.from(table.rows);
    return rows.slice(0, rowIndex).reduce((total, row) => total + row.getBoundingClientRect().height, 0) + currentHeight;
  }, [tableRef]);
  const applyResize = React.useCallback((event: PointerEvent, finished: boolean) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;
    const position = dragState.direction === "bottom" ? event.clientY : event.clientX;
    const delta = position - dragState.initialPosition;
    if (dragState.direction === "bottom") {
      const nextHeight = roundCellSizeToStep(resizeLengthClampStatic(dragState.initialSize + delta, { min: TABLE_MIN_ROW_HEIGHT }), undefined);
      if (finished) {
        setTableRowSize(editor, { height: nextHeight, rowIndex: dragState.rowIndex }, { at: tablePath });
        setTimeout(() => overrideRowSize(dragState.rowIndex, null), 0);
      } else {
        showRowIndicator(hoverIndicatorRef, getRowBoundaryOffset(dragState.rowIndex, nextHeight));
        overrideRowSize(dragState.rowIndex, nextHeight);
      }
      return;
    }
    const nextWidth = roundCellSizeToStep(resizeLengthClampStatic(dragState.initialSize + delta, { min: minColumnWidth }), undefined);
    if (finished) {
      setTableColSize(editor, { colIndex: dragState.colIndex, width: nextWidth }, { at: tablePath });
      setTimeout(() => overrideColSize(dragState.colIndex, null), 0);
    } else {
      showColumnIndicator(hoverIndicatorRef, getColumnBoundaryOffset(dragState.colIndex, nextWidth));
      overrideColSize(dragState.colIndex, nextWidth);
    }
  }, [editor, getColumnBoundaryOffset, getRowBoundaryOffset, hoverIndicatorRef, minColumnWidth, overrideColSize, overrideRowSize, showColumnIndicator, showRowIndicator, tablePath]);
  const stopResize = React.useCallback(() => {
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    activeHandleKeyRef.current = null;
    previewHandleKeyRef.current = null;
    dragStateRef.current = null;
    hideIndicator(dragIndicatorRef);
    hideIndicator(hoverIndicatorRef);
  }, [dragIndicatorRef, hideIndicator, hoverIndicatorRef]);
  React.useEffect(() => stopResize, [stopResize]);
  const startResize = React.useCallback((event: React.PointerEvent<HTMLDivElement>, { colIndex, direction, handleKey, rowIndex }: TableResizeStartOptions) => {
    event.preventDefault();
    event.stopPropagation();
    const table = tableRef.current;
    const initialSize = direction === "bottom" ? table?.rows.item(rowIndex)?.getBoundingClientRect().height ?? TABLE_MIN_ROW_HEIGHT : effectiveColSizesRef.current[colIndex] ?? TABLE_DEFAULT_COLUMN_WIDTH;
    dragStateRef.current = {
      colIndex,
      direction,
      initialPosition: direction === "bottom" ? event.clientY : event.clientX,
      initialSize,
      rowIndex,
    };
    activeHandleKeyRef.current = handleKey;
    const onPointerMove = (nextEvent: PointerEvent) => applyResize(nextEvent, false);
    const onPointerUp = (nextEvent: PointerEvent) => {
      applyResize(nextEvent, true);
      stopResize();
    };
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp, { once: true });
    cleanupListenersRef.current = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
    applyResize(event.nativeEvent, false);
  }, [applyResize, stopResize, tableRef]);
  const setResizePreview = React.useCallback((event: React.PointerEvent<HTMLDivElement>, options: TableResizeStartOptions) => {
    if (activeHandleKeyRef.current) return;
    previewHandleKeyRef.current = options.handleKey;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handleRect = event.currentTarget.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();
    if (options.direction === "bottom") {
      showRowIndicator(hoverIndicatorRef, handleRect.top - wrapperRect.top + handleRect.height / 2);
      return;
    }
    showColumnIndicator(hoverIndicatorRef, handleRect.left - wrapperRect.left + handleRect.width / 2);
  }, [hoverIndicatorRef, showColumnIndicator, showRowIndicator, wrapperRef]);
  const clearResizePreview = React.useCallback((handleKey: string) => {
    if (activeHandleKeyRef.current) return;
    if (previewHandleKeyRef.current !== handleKey) return;
    previewHandleKeyRef.current = null;
    hideIndicator(hoverIndicatorRef);
  }, [hideIndicator, hoverIndicatorRef]);
  return React.useMemo(() => ({ clearResizePreview, setResizePreview, startResize }), [clearResizePreview, setResizePreview, startResize]);
};
