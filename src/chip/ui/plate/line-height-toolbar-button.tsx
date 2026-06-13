"use client";

import * as React from "react";

import { LineHeightPlugin } from "@platejs/basic-styles/react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";

import { CheckIcon, WrapText } from "lucide-react";

import { useEditorRef, useSelectionFragmentProp } from "platejs/react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";

import { ToolbarButton } from "./toolbar";

const LineHeightToolbarButton = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const { defaultNodeValue, validNodeValues: values = [] } = editor.getInjectProps(LineHeightPlugin);
  const value = useSelectionFragmentProp({ defaultValue: defaultNodeValue, getProp: (node) => node.lineHeight });
  const [open, setOpen] = React.useState(false);
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
            <DropdownMenuRadioItem key={nextValue} className="min-w-[180px] pl-2 *:first:[span]:hidden" value={nextValue}>
              <span className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
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
