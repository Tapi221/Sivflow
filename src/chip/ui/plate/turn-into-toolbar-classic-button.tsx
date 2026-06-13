"use client";

import * as React from "react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { ChevronRightIcon, FileCodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, ListIcon, ListOrderedIcon, PilcrowIcon, QuoteIcon, SquareIcon } from "lucide-react";

import type { TElement } from "platejs";

import { KEYS } from "platejs";

import { useEditorRef, useSelectionFragmentProp } from "platejs/react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";

import { ToolbarButton, ToolbarMenuGroup } from "./toolbar";

import { getBlockType, setBlockType } from "@/components/editor/transforms";



const turnIntoItems = [
  { icon: <PilcrowIcon />, label: "Text", value: KEYS.p },
  { icon: <Heading1Icon />, label: "Heading 1", value: "h1" },
  { icon: <Heading2Icon />, label: "Heading 2", value: "h2" },
  { icon: <Heading3Icon />, label: "Heading 3", value: "h3" },
  { icon: <ListIcon />, label: "Bulleted list", value: KEYS.ulClassic },
  { icon: <ListOrderedIcon />, label: "Numbered list", value: KEYS.olClassic },
  { icon: <SquareIcon />, label: "To-do list", value: KEYS.taskList },
  { icon: <ChevronRightIcon />, label: "Toggle list", value: KEYS.toggle },
  { icon: <FileCodeIcon />, label: "Code", value: KEYS.codeBlock },
  { icon: <QuoteIcon />, label: "Quote", value: KEYS.blockquote },
];



const TurnIntoToolbarButton = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as TElement),
  });
  const selectedItem = React.useMemo(
    () => turnIntoItems.find((item) => item.value === (value ?? KEYS.p)) ?? turnIntoItems[0],
    [value],
  );
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton className="min-w-[125px]" pressed={open} tooltip="Turn into" isDropdown>
          {selectedItem.label}
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-0" align="start">
        <ToolbarMenuGroup label="Turn into">
          {turnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuItem
              key={itemValue}
              className="min-w-[180px]"
              onSelect={() => {
                setBlockType(editor, itemValue);
                editor.tf.focus();
              }}
            >
              {icon}
              {label}
            </DropdownMenuItem>
          ))}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};



export { TurnIntoToolbarButton, turnIntoItems };
