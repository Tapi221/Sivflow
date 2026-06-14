"use client";

import { useState } from "react";
import type { Alignment } from "@platejs/basic-styles";
import { TextAlignPlugin } from "@platejs/basic-styles/react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { AlignCenterIcon, AlignJustifyIcon, AlignLeftIcon, AlignRightIcon } from "lucide-react";
import { useEditorPlugin, useSelectionFragmentProp } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

const items = [
  { icon: AlignLeftIcon, label: "Align left", value: "left" },
  { icon: AlignCenterIcon, label: "Align center", value: "center" },
  { icon: AlignRightIcon, label: "Align right", value: "right" },
  { icon: AlignJustifyIcon, label: "Justify", value: "justify" },
];

const AlignToolbarButton = (props: DropdownMenuProps) => {
  const { editor, tf } = useEditorPlugin(TextAlignPlugin);
  const value = useSelectionFragmentProp({
    defaultValue: "left",
    getProp: (node) => node.align,
  }) ?? "left";
  const [open, setOpen] = useState(false);
  const IconValue = items.find((item) => item.value === value)?.icon ?? AlignLeftIcon;
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Align" isDropdown>
          <IconValue />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44" align="start">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => {
            tf.textAlign.setNodes(nextValue as Alignment);
            editor.tf.focus();
          }}
        >
          {items.map(({ icon: Icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem key={itemValue} value={itemValue}>
              <Icon />
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { AlignToolbarButton };
