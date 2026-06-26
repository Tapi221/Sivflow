"use client";

import * as React from "react";

import type { DropdownMenuItemProps, DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import type { PaletteNoteFontColorToken } from "@shared/design-tokens/color/Palette.Note.Font";

import { PALETTE_NOTE_FONT_COLORS, PALETTE_NOTE_FONT_CUSTOM_COLORS } from "@shared/design-tokens/color/Palette.Note.Font";

import { useComposedRef } from "@udecode/cn";

import { buttonVariants } from "@web-renderer/chip/button/button/button";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@web-renderer/chip/panel/dropdown-menu";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@web-renderer/chip/panel/toolchip/Tooltip.Editor";

import { ToolbarButton, ToolbarMenuGroup } from "@web-renderer/chip/ui/plate/toolbar";

import { cn } from "@web-renderer/lib/utils";

import debounce from "lodash/debounce.js";

import { CheckIcon, EraserIcon, PlusIcon } from "lucide-react";

import type { PlateEditor } from "platejs/react";

import { useEditorRef, useEditorSelector } from "platejs/react";



type ColorDropdownMenuItemProps = {
  isBrightColor: boolean;
  isSelected: boolean;
  name?: string;
  updateColor: (color: string) => void;
  value: string;
} & DropdownMenuItemProps;

type ColorDropdownMenuItemsProps = {
  color?: string;
  colors: PaletteNoteFontColorToken[];
  updateColor: (color: string) => void;
} & React.ComponentProps<"div">;

type ColorCustomProps = {
  color?: string;
  colors: PaletteNoteFontColorToken[];
  colorsQueue: string[];
  customColors: PaletteNoteFontColorToken[];
  recordColorUsage: (color: string) => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  updatedColor?: string;
} & React.ComponentPropsWithoutRef<"div">;

type PureColorPickerProps = {
  clearColor: () => void;
  color?: string;
  colors: PaletteNoteFontColorToken[];
  colorsQueue: string[];
  customColors: PaletteNoteFontColorToken[];
  recordColorUsage: (color: string) => void;
  updateColor: (color: string) => void;
  updateCustomColor: (color: string) => void;
  updatedColor?: string;
} & React.ComponentProps<"div">;

type ButtonClickPanelNoteFontColorProps = {
  nodeType: string;
  tooltip?: string;
} & DropdownMenuProps;



const MAX_CUSTOM_COLORS = 19;

const MAX_COLOR_QUEUE = 30;

const HEX_COLOR_RE = /^#[\da-f]{6}$/i;



const normalizeColor = (color: string): string => color.toLowerCase();

const isValidHexColor = (color: string): boolean => HEX_COLOR_RE.test(color);

const isDefaultColor = (color: string): boolean => PALETTE_NOTE_FONT_COLORS.some((defaultColor) => normalizeColor(defaultColor.value) === color);

const computeIsBrightColor = (hex: string): boolean => {
  if (!isValidHexColor(hex)) return false;
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 130;
};

const getEditorColorMarks = (editor: PlateEditor, nodeType: string): string[] => {
  const usedColors = new Set<string>();
  for (const [node] of editor.api.nodes({ at: [], match: (node) => "text" in node && typeof (node as Record<string, unknown>)[nodeType] === "string", mode: "all" })) {
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

const ColorDropdownMenuItem = ({ className, isBrightColor, isSelected, name, updateColor, value, ...props }: ColorDropdownMenuItemProps) => {
  const content = (
    <DropdownMenuItem
      className={cn(
        buttonVariants({ size: "icon", variant: "outline" }),
        "my-1 flex size-6 items-center justify-center rounded-full border border-muted border-solid p-0 transition-all hover:scale-125",
        !isBrightColor && "border-transparent text-white",
        className,
      )}
      style={{ backgroundColor: value }}
      onSelect={(event) => {
        event.preventDefault();
        updateColor(value);
      }}
      {...props}
    >
      {isSelected ? <CheckIcon className="!size-3" strokeWidth={3} /> : null}
    </DropdownMenuItem>
  );
  return name ? (
    <Tooltip>
      <TooltipTrigger>{content}</TooltipTrigger>
      <TooltipContent className="mb-1 capitalize">{name}</TooltipContent>
    </Tooltip>
  ) : content;
};

const ColorDropdownMenuItems = ({ className, color, colors, updateColor, ...props }: ColorDropdownMenuItemsProps) => {
  return (
    <div className={cn("grid grid-cols-[repeat(10,1fr)] place-items-center gap-x-1", className)} {...props}>
      <TooltipProvider>
        {colors.map(({ isBrightColor, name, value }) => (
          <ColorDropdownMenuItem
            key={name ?? value}
            name={name}
            value={value}
            isBrightColor={isBrightColor}
            isSelected={Boolean(color) && normalizeColor(color!) === normalizeColor(value)}
            updateColor={updateColor}
          />
        ))}
        {props.children}
      </TooltipProvider>
    </div>
  );
};

const ColorCustom = ({ className, color, colors, colorsQueue, customColors, recordColorUsage, updateColor, updateCustomColor, updatedColor, ...props }: ColorCustomProps) => {
  const [value, setValue] = React.useState<string>(color ?? "#000");
  const fullCustomColors = React.useMemo(
    () => colorsQueue
      .filter((queuedColor) => normalizeColor(queuedColor) !== normalizeColor(updatedColor ?? ""))
      .filter((queuedColor) => !PALETTE_NOTE_FONT_COLORS.some((defaultColor) => normalizeColor(defaultColor.value) === normalizeColor(queuedColor)))
      .filter((queuedColor) => !PALETTE_NOTE_FONT_CUSTOM_COLORS.some((defaultColor) => normalizeColor(defaultColor.value) === normalizeColor(queuedColor)))
      .map((queuedColor) => ({ isBrightColor: computeIsBrightColor(queuedColor), name: queuedColor, value: queuedColor }))
      .slice(0, MAX_CUSTOM_COLORS - customColors.length - (updatedColor ? 1 : 0)),
    [colorsQueue, customColors.length, updatedColor],
  );
  const isColorInCollections = React.useCallback(
    (targetColor: string) => colors.some((item) => normalizeColor(item.value) === normalizeColor(targetColor)) || customColors.some((item) => normalizeColor(item.value) === normalizeColor(targetColor)) || fullCustomColors.some((item) => normalizeColor(item.value) === normalizeColor(targetColor)),
    [colors, customColors, fullCustomColors],
  );
  const customColor = React.useMemo(() => (!updatedColor || isColorInCollections(updatedColor) ? null : updatedColor), [isColorInCollections, updatedColor]);
  const computedColors = React.useMemo(
    () => customColor ? [...customColors, { isBrightColor: computeIsBrightColor(customColor), name: customColor, value: customColor }, ...fullCustomColors] : [...customColors, ...fullCustomColors],
    [customColor, fullCustomColors, customColors],
  );
  const updateCustomColorDebounced = React.useMemo(() => debounce((nextValue: string) => updateCustomColor(nextValue), 100), [updateCustomColor]);
  React.useEffect(() => () => {
    updateCustomColorDebounced.cancel();
  }, [updateCustomColorDebounced]);
  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <ColorDropdownMenuItems
        color={color}
        colors={computedColors}
        updateColor={(nextColor) => {
          updateColor(nextColor);
          recordColorUsage(normalizeColor(nextColor));
        }}
      >
        <ColorInput
          className="col-start-10"
          onChange={(event) => {
            setValue(event.target.value);
            updateCustomColorDebounced(event.target.value);
          }}
          value={value}
        >
          <DropdownMenuItem
            className={cn(buttonVariants({ size: "icon", variant: "outline" }), "flex size-8 items-center justify-center rounded-full")}
            onSelect={(event) => {
              event.preventDefault();
            }}
          >
            <span className="sr-only">Custom</span>
            <PlusIcon />
          </DropdownMenuItem>
        </ColorInput>
      </ColorDropdownMenuItems>
    </div>
  );
};

const PureColorPicker = ({ className, clearColor, color, colors, colorsQueue, customColors, recordColorUsage, updateColor, updateCustomColor, updatedColor, ...props }: PureColorPickerProps) => {
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <ToolbarMenuGroup label="Custom Colors">
        <ColorCustom
          className="px-2"
          color={color}
          colors={colors}
          colorsQueue={colorsQueue}
          customColors={customColors}
          recordColorUsage={recordColorUsage}
          updateColor={updateColor}
          updateCustomColor={updateCustomColor}
          updatedColor={updatedColor}
        />
      </ToolbarMenuGroup>
      <ToolbarMenuGroup label="Default Colors">
        <ColorDropdownMenuItems className="px-2" color={color} colors={colors} updateColor={updateColor} />
      </ToolbarMenuGroup>
      {color ? (
        <ToolbarMenuGroup>
          <DropdownMenuItem className="p-2" onClick={clearColor}>
            <EraserIcon />
            <span>Clear</span>
          </DropdownMenuItem>
        </ToolbarMenuGroup>
      ) : null}
    </div>
  );
};

const ButtonClickPanelNoteFontColor = ({ children, nodeType, tooltip, ...props }: ButtonClickPanelNoteFontColorProps) => {
  const editor = useEditorRef();
  const selectionDefined = useEditorSelector((nextEditor) => Boolean(nextEditor.selection), []);
  const color = useEditorSelector((nextEditor) => nextEditor.api.mark(nodeType) as string, [nodeType]);
  const [selectedColor, setSelectedColor] = React.useState<string>();
  const [updatedColor, setUpdatedColor] = React.useState<string>();
  const [open, setOpen] = React.useState(false);
  const [colorsQueue, setColorsQueue] = React.useState<string[]>([]);
  const recordColorUsage = React.useCallback((colorValue: string) => {
    const normalized = normalizeColor(colorValue);
    if (!isValidHexColor(normalized)) return;
    setColorsQueue((prev) => {
      const filtered = prev.filter((queuedColor) => queuedColor !== normalized).filter((queuedColor) => !isDefaultColor(queuedColor));
      return [normalized, ...filtered].slice(0, MAX_COLOR_QUEUE);
    });
  }, []);
  const appendColors = React.useCallback((colors: string[]) => {
    setColorsQueue((prev) => {
      const normalized = colors.map(normalizeColor).filter(isValidHexColor);
      const existingSet = new Set(prev);
      const newColors = normalized.filter((queuedColor) => !existingSet.has(queuedColor)).filter((queuedColor) => !isDefaultColor(queuedColor));
      return [...newColors, ...prev].slice(0, MAX_COLOR_QUEUE);
    });
  }, []);
  const onToggle = React.useCallback((value = !open) => {
    setOpen(value);
    if (value) {
      const colorUsed = getEditorColorMarks(editor, nodeType);
      appendColors(colorUsed);
      if (selectedColor) recordColorUsage(normalizeColor(selectedColor));
    }
    if (!value) {
      setUpdatedColor(undefined);
      if (editor.selection) setTimeout(() => editor.tf.focus(), 100);
    }
  }, [open, editor, nodeType, appendColors, selectedColor, recordColorUsage]);
  const updateColor = React.useCallback((value: string) => {
    if (editor.selection) {
      setSelectedColor(value);
      setUpdatedColor(value);
      editor.tf.select(editor.selection);
      editor.tf.addMarks({ [nodeType]: value });
    }
  }, [editor, nodeType]);
  const updateColorAndClose = React.useCallback((value: string) => {
    updateColor(value);
    onToggle();
  }, [onToggle, updateColor]);
  const clearColor = React.useCallback(() => {
    if (editor.selection) {
      editor.tf.select(editor.selection);
      editor.tf.removeMarks(nodeType);
      onToggle();
    }
  }, [editor, onToggle, nodeType]);
  React.useEffect(() => {
    if (selectionDefined) {
      setSelectedColor(color);
    }
  }, [color, selectionDefined]);
  return (
    <DropdownMenu modal onOpenChange={onToggle} open={open} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip={tooltip}>{children}</ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <ColorPicker
          clearColor={clearColor}
          color={selectedColor ?? color}
          colors={PALETTE_NOTE_FONT_COLORS}
          colorsQueue={colorsQueue}
          customColors={PALETTE_NOTE_FONT_CUSTOM_COLORS}
          recordColorUsage={recordColorUsage}
          updateColor={updateColorAndClose}
          updateCustomColor={updateColor}
          updatedColor={updatedColor}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



const ColorPicker = React.memo(PureColorPicker, (prev, next) => prev.color === next.color && prev.colors === next.colors && prev.colorsQueue === next.colorsQueue && prev.customColors === next.customColors && prev.updatedColor === next.updatedColor);

export { ButtonClickPanelNoteFontColor, ColorDropdownMenuItems };
