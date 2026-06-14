"use client";

import { useState } from "react";

import { LineHeightPlugin } from "@platejs/basic-styles/react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";

import { CheckIcon, WrapText } from "lucide-react";

import { useEditorRef, useSelectionFragmentProp } from "platejs/react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";

import { ToolbarButton } from "./toolbar";



const LINE_HEIGHT_MENU_ITEM_CLASS_NAME = "dropdown-menu__radio-item--check-end min-w-44";



const LineHeightToolbarButton = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const { defaultNodeValue, validNodeValues: values = [] } = editor.getInjectProps(LineHeightPlugin);
  const value = useSelectionFragmentProp({ defaultValue: defaultNodeValue, getProp: (node) => node.lineHeight });
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Line height" isDropdown>
          <WrapText />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-0" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(newValue) => {
            editor.getTransforms(LineHeightPlugin).lineHeight.setNodes(Number(newValue));
            editor.tf.focus();
          }}
        >
          {values.map((nextValue) => (
            <DropdownMenuRadioItem key={nextValue} className={LINE_HEIGHT_MENU_ITEM_CLASS_NAME} value={nextValue}>
              <span className="dropdown-menu__check-indicator">
                <DropdownMenuItemIndicator>
                  <CheckIcon />
                </DropdownMenuItemIndicator>
              </span>
              {nextValue}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



export { LineHeightToolbarButton };
