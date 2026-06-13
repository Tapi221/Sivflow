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
const TableActionButton = ({ children, disabled, onAction, tooltip }: TableActionButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      disabled={disabled}
      onClick={() => {
        onAction();
        editor.tf.focus();
      }}
      onMouseDown={(event) => event.preventDefault()}
      tooltip={tooltip}
    >
      {children}
    </ToolbarButton>
  );
};
const TableCellBackgroundButton = ({ color, path }: { color?: string; path: number[] }) => {
  const editor = useEditorRef();
  const updateColor = React.useCallback((nextColor: string) => {
    editor.tf.select(path);
    setCellBackground(editor, { color: nextColor });
    editor.tf.focus();
  }, [editor, path]);
  const clearColor = React.useCallback(() => {
    editor.tf.select(path);
    setCellBackground(editor, { color: null });
    editor.tf.focus();
  }, [editor, path]);
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton tooltip="Cell background">
          <PaintBucketIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <ToolbarMenuGroup label="Background">
          <ColorDropdownMenuItems className="px-2" color={color} colors={DEFAULT_COLORS} updateColor={updateColor} />
          {color ? (
            <DropdownMenuItem className="p-2" onSelect={clearColor}>
              <EraserIcon />
              <span>Clear</span>
            </DropdownMenuItem>
          ) : null}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
const TableCellToolbar = ({ color, path }: { color?: string; path: number[] }) => {
  const { tf } = useEditorPlugin(TablePlugin);
  const mergeState = useTableMergeState();
  return (
    <PopoverContent align="center" className="w-auto p-1" onOpenAutoFocus={(event) => event.preventDefault()} side="top" sideOffset={8}>
      <Toolbar>
        <ToolbarGroup>
          <TableActionButton tooltip="Insert row above" onAction={() => tf.insert.tableRow({ before: true })}>
            <ArrowUp />
          </TableActionButton>
          <TableActionButton tooltip="Insert row below" onAction={() => tf.insert.tableRow()}>
            <ArrowDown />
          </TableActionButton>
          <TableActionButton tooltip="Insert column before" onAction={() => tf.insert.tableColumn({ before: true })}>
            <ArrowLeft />
          </TableActionButton>
          <TableActionButton tooltip="Insert column after" onAction={() => tf.insert.tableColumn()}>
            <ArrowRight />
          </TableActionButton>
        </ToolbarGroup>
        <ToolbarGroup>
          <TableActionButton disabled={!mergeState.canMerge} tooltip="Merge cells" onAction={() => tf.table.merge()}>
            <CombineIcon />
          </TableActionButton>
          <TableActionButton disabled={!mergeState.canSplit} tooltip="Split cell" onAction={() => tf.table.split()}>
            <SquareSplitHorizontalIcon />
          </TableActionButton>
        </ToolbarGroup>
        <ToolbarGroup>
          <TableCellBackgroundButton color={color} path={path} />
        </ToolbarGroup>
        <ToolbarGroup>
          <TableActionButton tooltip="Delete row" onAction={() => tf.remove.tableRow()}>
            <XIcon />
          </TableActionButton>
          <TableActionButton tooltip="Delete column" onAction={() => tf.remove.tableColumn()}>
            <Trash2Icon />
          </TableActionButton>
          <TableActionButton tooltip="Delete table" onAction={() => tf.remove.table()}>
            <Grid2X2Icon />
          </TableActionButton>
        </ToolbarGroup>
      </Toolbar>
    </PopoverContent>
  );
};
const TableResizeHandle = ({ colIndex, direction, rowIndex }: { colIndex: number; direction: TableResizeDirection; rowIndex: number }) => {
  const { clearResizePreview, setResizePreview, startResize } = useTableResizeContext();
  const handleKey = `${direction}:${rowIndex}:${colIndex}`;
  return (
    <div
      className={cn(
        "absolute z-30 bg-transparent",
        direction === "right" && "-right-1 top-0 h-full w-2 cursor-col-resize",
        direction === "bottom" && "-bottom-1 left-0 h-2 w-full cursor-row-resize",
      )}
      contentEditable={false}
      onPointerDown={(event) => startResize(event, { colIndex, direction, handleKey, rowIndex })}
      onPointerEnter={(event) => setResizePreview(event, { colIndex, direction, handleKey, rowIndex })}
      onPointerLeave={() => clearResizePreview(handleKey)}
    />
  );
};
const TableElement = ({ children, ...props }: PlateElementProps<TTableElement>) => {
  const { element } = props;
  const { getOptions, tf } = useEditorPlugin(TablePlugin);
  const { disableMarginLeft } = getOptions();
  const readOnly = useReadOnly();
  const selected = useSelected();
  const focused = useFocusedLast();
  const tableRef = React.useRef<HTMLTableElement | null>(null);
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const hoverIndicatorRef = React.useRef<HTMLDivElement | null>(null);
  const dragIndicatorRef = React.useRef<HTMLDivElement | null>(null);
  const colSizes = useTableColSizes({ disableOverrides: true });
  const marginLeft = disableMarginLeft ? 0 : element.marginLeft;
  const columnCount = Math.max(getTableColumnCount(element), colSizes.length, 1);
  const effectiveColSizes = React.useMemo(() => Array.from({ length: columnCount }, (_, index) => colSizes[index] ?? TABLE_DEFAULT_COLUMN_WIDTH), [colSizes, columnCount]);
  const resizeContext = useTableResizeController({
    dragIndicatorRef,
    effectiveColSizes,
    hoverIndicatorRef,
    tablePath: getElementPath(props),
    tableRef,
    wrapperRef,
  });
  return (
    <PlateElement {...props} className="overflow-x-auto py-5" style={{ paddingLeft: marginLeft }}>
      <TableResizeContext.Provider value={resizeContext}>
        <Popover modal={false} open={!readOnly && focused && selected}>
          <PopoverAnchor asChild>
            <div className="group/table relative w-fit" ref={wrapperRef}>
              <table
                className="mr-0 ml-px table h-px table-fixed border-collapse"
                ref={tableRef}
                style={{ borderCollapse: "collapse", width: "100%" }}
              >
                <colgroup>
                  {effectiveColSizes.map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>
                <tbody className="min-w-full">{children}</tbody>
              </table>
              <div className="pointer-events-none absolute z-40 hidden bg-brand/60" contentEditable={false} ref={hoverIndicatorRef} />
              <div className="pointer-events-none absolute z-40 hidden bg-brand" contentEditable={false} ref={dragIndicatorRef} />
            </div>
          </PopoverAnchor>
          <PopoverContent align="start" className="w-auto p-1" onOpenAutoFocus={(event) => event.preventDefault()} side="top" sideOffset={8}>
            <Toolbar>
              <ToolbarGroup>
                <TableActionButton tooltip="Delete table" onAction={() => tf.remove.table()}>
                  <Trash2Icon />
                </TableActionButton>
              </ToolbarGroup>
            </Toolbar>
          </PopoverContent>
        </Popover>
      </TableResizeContext.Provider>
    </PlateElement>
  );
};
const TableRowElement = (props: PlateElementProps<TTableRowElement>) => {
  return (
    <PlateElement {...props} as="tr" className="h-full">
      {props.children}
    </PlateElement>
  );
};
const TableCellElement = ({ isHeader, ...props }: TableCellElementProps) => {
  const editor = useEditorRef();
  const readOnly = useReadOnly();
  const selected = useSelected();
  const blockSelected = useBlockSelected();
  const path = getElementPath(props);
  const { colIndex, rowIndex } = getCellIndicesFromPath(path);
  const { element } = props;
  const { api } = editor.getPlugin(TablePlugin);
  const { minHeight, width } = api.table.getCellSize({ element });
  const borders = api.table.getCellBorders({ element });
  const colSpan = api.table.getColSpan(element);
  const rowSpan = api.table.getRowSpan(element);
  const popoverOpen = !readOnly && (selected || blockSelected);
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
          maxWidth: width || 240,
          minWidth: width || 120,
        } as React.CSSProperties
      }
    >
      <Popover modal={false} open={popoverOpen}>
        <PopoverAnchor asChild>
          <div className="relative z-20 box-border h-full px-4 py-2" style={{ minHeight }}>
            {props.children}
            {blockSelected ? <div className={blockSelectionVariants({ active: blockSelected })} contentEditable={false} /> : null}
          </div>
        </PopoverAnchor>
        <TableCellToolbar color={element.background as string | undefined} path={path} />
      </Popover>
      {!readOnly ? (
        <>
          <TableResizeHandle colIndex={colIndex} direction="right" rowIndex={rowIndex} />
          <TableResizeHandle colIndex={colIndex} direction="bottom" rowIndex={rowIndex} />
        </>
      ) : null}
    </PlateElement>
  );
};
const TableCellHeaderElement = (props: PlateElementProps<TTableCellElement>) => {
  return <TableCellElement {...props} isHeader />;
};

export { TableElement, TableRowElement, TableCellElement, TableCellHeaderElement };
export type { TableCellElementProps };
