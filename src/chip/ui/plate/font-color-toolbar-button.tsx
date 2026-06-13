"use client";

import * as React from "react";

import type { DropdownMenuItemProps, DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { useComposedRef } from "@udecode/cn";

import debounce from "lodash/debounce.js";

import { CheckIcon, EraserIcon, PlusIcon } from "lucide-react";

import type { PlateEditor } from "platejs/react";

import { useEditorRef, useEditorSelector } from "platejs/react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";

import { buttonVariants } from "@/chip/ui/button/button";

import { ToolbarButton, ToolbarMenuGroup } from "./toolbar";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/chip/ui/tooltip";

import { cn } from "@/lib/utils";



type TColor = {
  isBrightColor: boolean; name: string; value: string };



const MAX_CUSTOM_COLORS = 19;

const HEX_COLOR_RE = /^#[\da-f]{6}$/i;

const DEFAULT_CUSTOM_COLORS = [{ isBrightColor: false, name: "dark orange 3", value: "#783F04" }, { isBrightColor: false, name: "dark grey 3", value: "#666" }, { isBrightColor: false, name: "dark grey 2", value: "#999" }, { isBrightColor: false, name: "light cornflower blue 1", value: "#6C9EEB" }, { isBrightColor: false, name: "dark magenta 3", value: "#4C1130" }];

const DEFAULT_COLORS = [{ isBrightColor: false, name: "black", value: "#000" }, { isBrightColor: false, name: "dark grey 4", value: "#434343" }, { isBrightColor: false, name: "dark grey 3", value: "#666" }, { isBrightColor: false, name: "dark grey 2", value: "#999" }, { isBrightColor: false, name: "dark grey 1", value: "#B7B7B7" }, { isBrightColor: false, name: "grey", value: "#ccc" }, { isBrightColor: false, name: "light grey 1", value: "#D9D9D9" }, { isBrightColor: true, name: "light grey 2", value: "#EFEFEF" }, { isBrightColor: true, name: "light grey 3", value: "#F3F3F3" }, { isBrightColor: true, name: "white", value: "#fff" }, { isBrightColor: false, name: "red berry", value: "#980100" }, { isBrightColor: false, name: "red", value: "#FE0000" }, { isBrightColor: false, name: "orange", value: "#FE9900" }, { isBrightColor: true, name: "yellow", value: "#FEFF00" }, { isBrightColor: false, name: "green", value: "#0f0" }, { isBrightColor: false, name: "cyan", value: "#0ff" }, { isBrightColor: false, name: "cornflower blue", value: "#4B85E8" }, { isBrightColor: false, name: "blue", value: "#1300FF" }, { isBrightColor: false, name: "purple", value: "#90f" }, { isBrightColor: false, name: "magenta", value: "#f0f" }];



const normalizeColor = (color: string): string => color.toLowerCase();

const isValidHexColor = (color: string): boolean => HEX_COLOR_RE.test(color);

const computeIsBrightColor = (hex: string): boolean => {
  if (!isValidHexColor(hex)) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 130;
};

const getEditorColorMarks = (editor: PlateEditor, nodeType: string): string[] => {
  const usedColors = new Set<string>();
  for (const [node] of editor.api.nodes({ at: [], match: (n) => "text" in n && typeof (n as Record<string, unknown>)[nodeType] === "string", mode: "all" })) {
    usedColors.add(normalizeColor((node as Record<string, unknown>)[nodeType] as string));
  }
  return Array.from(usedColors);
};



const ColorInput = ({ children, className, value = "#000", ...props }: React.ComponentProps<"input"> & { className?: string }) => {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  return (
    <div className={cn("flex flex-col items-center", className)}>
      {React.Children.map(children, (child) => child ? React.cloneElement(child as React.ReactElement<{ onClick: () => void }>, { onClick: () => inputRef.current?.click() }) : child)}
      <input {...props} className="size-0 overflow-hidden border-0 p-0" ref={useComposedRef(props.ref, inputRef)} type="color" value={value} />
    </div>
  );
};

const ColorDropdownMenuItem = ({ className, isBrightColor, isSelected, name, updateColor, value, ...props }: { isBrightColor: boolean; isSelected: boolean; value: string; updateColor: (color: string) => void; name?: string } & DropdownMenuItemProps) => {
  const content = (
    <DropdownMenuItem className={cn(buttonVariants({ size: "icon", variant: "outline" }), "my-1 flex size-6 items-center justify-center rounded-full border border-muted border-solid p-0 transition-all hover:scale-125", !isBrightColor && "border-transparent text-white", className)} style={{ backgroundColor: value }} onSelect={(e) => {
      e.preventDefault(); updateColor(value); }} {...props}
    >
      {isSelected ? <CheckIcon className="!size-3" strokeWidth={3} /> : null}
    </DropdownMenuItem>
  );
  return name ? <Tooltip><TooltipTrigger>{content}</TooltipTrigger><TooltipContent className="mb-1 capitalize">{name}</TooltipContent></Tooltip> : content;
};

const ColorDropdownMenuItems = ({ className, color, colors, updateColor, ...props }: { colors: TColor[]; updateColor: (color: string) => void; color?: string } & React.ComponentProps<"div">) => (
  <div className={cn("grid grid-cols-[repeat(10,1fr)] place-items-center gap-x-1", className)} {...props}>
    <TooltipProvider>
      {colors.map(({ isBrightColor, name, value }) => <ColorDropdownMenuItem name={name} key={name ?? value} value={value} isBrightColor={isBrightColor} isSelected={!!color && normalizeColor(color) === normalizeColor(value)} updateColor={updateColor} />)}
      {props.children}
    </TooltipProvider>
  </div>
);

const ColorCustom = ({ className, color, colors, colorsQueue, customColors, recordColorUsage, updateColor, updateCustomColor, updatedColor, ...props }: { colors: TColor[]; colorsQueue: string[]; customColors: TColor[]; recordColorUsage: (color: string) => void; updateColor: (color: string) => void; updateCustomColor: (color: string) => void; color?: string; updatedColor?: string } & React.ComponentPropsWithoutRef<"div">) => {
  const [value, setValue] = React.useState<string>(color ?? "#000");
  const fullCustomColors = React.useMemo(() => colorsQueue.filter((c) => normalizeColor(c) !== normalizeColor(updatedColor ?? "")).filter((c) => !DEFAULT_COLORS.some((dc) => normalizeColor(dc.value) === normalizeColor(c))).filter((c) => !DEFAULT_CUSTOM_COLORS.some((dc) => normalizeColor(dc.value) === normalizeColor(c))).map((c) => ({ isBrightColor: computeIsBrightColor(c), name: c, value: c })).slice(0, MAX_CUSTOM_COLORS - customColors.length - (updatedColor ? 1 : 0)), [colorsQueue, customColors, updatedColor]);
  const isColorInCollections = React.useCallback((targetColor: string) => colors.some((c) => normalizeColor(c.value) === normalizeColor(targetColor)) || customColors.some((c) => normalizeColor(c.value) === normalizeColor(targetColor)) || fullCustomColors.some((c) => normalizeColor(c.value) === normalizeColor(targetColor)), [colors, customColors, fullCustomColors]);
  const customColor = React.useMemo(() => (!updatedColor || isColorInCollections(updatedColor) ? null : updatedColor), [isColorInCollections, updatedColor]);
  const computedColors = React.useMemo(() => customColor ? [...customColors, { isBrightColor: computeIsBrightColor(customColor), name: customColor, value: customColor }, ...fullCustomColors] : [...customColors, ...fullCustomColors], [customColor, fullCustomColors, customColors]);
  const updateCustomColorDebounced = React.useMemo(() => debounce((nextValue: string) => updateCustomColor(nextValue), 100), [updateCustomColor]);
  React.useEffect(() => () => {
    updateCustomColorDebounced.cancel(); }, [updateCustomColorDebounced]);
  return <div className={cn("flex flex-col gap-4", className)} {...props}><ColorDropdownMenuItems color={color} colors={computedColors} updateColor={(c) => {
    updateColor(c); recordColorUsage(normalizeColor(c)); }}
  ><ColorInput className="col-start-10" onChange={(e) => {
      setValue(e.target.value); updateCustomColorDebounced(e.target.value); }} value={value}
  ><DropdownMenuItem className={cn(buttonVariants({ size: "icon", variant: "outline" }), "flex size-8 items-center justify-center rounded-full")} onSelect={(e) => {
        e.preventDefault(); }}
    ><span className="sr-only">Custom</span><PlusIcon /></DropdownMenuItem></ColorInput></ColorDropdownMenuItems></div>;
};

const PureColorPicker = ({ className, clearColor, color, colors, colorsQueue, customColors, recordColorUsage, updateColor, updateCustomColor, updatedColor, ...props }: React.ComponentProps<"div"> & { colors: TColor[]; colorsQueue: string[]; customColors: TColor[]; clearColor: () => void; recordColorUsage: (color: string) => void; updateColor: (color: string) => void; updateCustomColor: (color: string) => void; color?: string; updatedColor?: string }) => (
  <div className={cn("flex flex-col", className)} {...props}>
    <ToolbarMenuGroup label="Custom Colors"><ColorCustom className="px-2" color={color} colors={colors} colorsQueue={colorsQueue} customColors={customColors} recordColorUsage={recordColorUsage} updateColor={updateColor} updateCustomColor={updateCustomColor} updatedColor={updatedColor} /></ToolbarMenuGroup>
    <ToolbarMenuGroup label="Default Colors"><ColorDropdownMenuItems className="px-2" color={color} colors={colors} updateColor={updateColor} /></ToolbarMenuGroup>
    {color && <ToolbarMenuGroup><DropdownMenuItem className="p-2" onClick={clearColor}><EraserIcon /><span>Clear</span></DropdownMenuItem></ToolbarMenuGroup>}
  </div>
);

const FontColorToolbarButton = ({ children, nodeType, tooltip }: { nodeType: string; tooltip?: string } & DropdownMenuProps) => {
  const editor = useEditorRef();
  const selectionDefined = useEditorSelector((nextEditor) => !!nextEditor.selection, []);
  const color = useEditorSelector((nextEditor) => nextEditor.api.mark(nodeType) as string, [nodeType]);
  const [selectedColor, setSelectedColor] = React.useState<string>();
  const [updatedColor, setUpdatedColor] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const [colorsQueue, setColorsQueue] = React.useState<string[]>([]);
  const recordColorUsage = React.useCallback((colorValue: string) => {
    const normalized = normalizeColor(colorValue); if (!isValidHexColor(normalized)) return; setColorsQueue((prev) => {
      const filtered = prev.filter((c) => c !== normalized).filter((c) => !DEFAULT_COLORS.some((dc) => normalizeColor(dc.value) === c)); return [normalized, ...filtered].slice(0, 30); }); }, []);
  const appendColors = React.useCallback((colors: string[]) => {
    setColorsQueue((prev) => {
      const normalized = colors.map(normalizeColor).filter(isValidHexColor); const existingSet = new Set(prev); const newColors = normalized.filter((c) => !existingSet.has(c)).filter((c) => !DEFAULT_COLORS.some((dc) => normalizeColor(dc.value) === c)); return [...newColors, ...prev].slice(0, 30); }); }, []);
  const onToggle = React.useCallback((value = !open) => {
    setOpen(value); if (value) {
      const colorUsed = getEditorColorMarks(editor, nodeType); appendColors(colorUsed); if (selectedColor) recordColorUsage(normalizeColor(selectedColor)); } if (!value) {
      setUpdatedColor(undefined); if (editor.selection) setTimeout(() => editor.tf.focus(), 100); } }, [open, editor, nodeType, appendColors, selectedColor, recordColorUsage]);
  const updateColor = React.useCallback((value: string) => {
    if (editor.selection) {
      setSelectedColor(value); setUpdatedColor(value); editor.tf.select(editor.selection); editor.tf.addMarks({ [nodeType]: value }); } }, [editor, nodeType]);
  const updateColorAndClose = React.useCallback((value: string) => {
    updateColor(value); onToggle(); }, [onToggle, updateColor]);
  const clearColor = React.useCallback(() => {
    if (editor.selection) {
      editor.tf.select(editor.selection); editor.tf.removeMarks(nodeType); onToggle(); } }, [editor, onToggle, nodeType]);
  React.useEffect(() => {
    if (selectionDefined) {
      setSelectedColor(color); } }, [color, selectionDefined]);
  return <DropdownMenu modal onOpenChange={onToggle} open={open}><DropdownMenuTrigger asChild><ToolbarButton pressed={open} tooltip={tooltip}>{children}</ToolbarButton></DropdownMenuTrigger><DropdownMenuContent align="start"><ColorPicker clearColor={clearColor} color={selectedColor || color} colors={DEFAULT_COLORS} colorsQueue={colorsQueue} customColors={DEFAULT_CUSTOM_COLORS} recordColorUsage={recordColorUsage} updateColor={updateColorAndClose} updateCustomColor={updateColor} updatedColor={updatedColor} /></DropdownMenuContent></DropdownMenu>;
};



const ColorPicker = React.memo(PureColorPicker, (prev, next) => prev.color === next.color && prev.colors === next.colors && prev.colorsQueue === next.colorsQueue && prev.customColors === next.customColors && prev.updatedColor === next.updatedColor);

export { DEFAULT_COLORS, FontColorToolbarButton, ColorDropdownMenuItems };
