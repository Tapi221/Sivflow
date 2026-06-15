"use client";

import { useMemo, useState } from "react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuItemIndicator } from "@radix-ui/react-dropdown-menu";
import { CheckIcon, ChevronRightIcon, Code2, Columns3Icon, FileCodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, Heading4Icon, Heading5Icon, Heading6Icon, ListIcon, ListOrderedIcon, PilcrowIcon, QuoteIcon, SquareIcon } from "lucide-react";
import type { TElement } from "platejs";
import { KEYS } from "platejs";
import { useEditorRef, useSelectionFragmentProp } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { ToolbarButton, ToolbarMenuGroup } from "@/chip/ui/plate/toolbar";
import { getBlockType, setBlockType } from "@/components/editor/transforms";

const TURN_INTO_MENU_ITEM_CLASS_NAME = "dropdown-menu__radio-item--check-end min-w-44";
const turnIntoItems = [
  { icon: <PilcrowIcon />, keywords: ["paragraph"], label: "Text", value: KEYS.p },
  { icon: <Heading1Icon />, keywords: ["title", "h1"], label: "Heading 1", value: "h1" },
  { icon: <Heading2Icon />, keywords: ["subtitle", "h2"], label: "Heading 2", value: "h2" },
  { icon: <Heading3Icon />, keywords: ["subtitle", "h3"], label: "Heading 3", value: "h3" },
  { icon: <Heading4Icon />, keywords: ["subtitle", "h4"], label: "Heading 4", value: "h4" },
  { icon: <Heading5Icon />, keywords: ["subtitle", "h5"], label: "Heading 5", value: "h5" },
  { icon: <Heading6Icon />, keywords: ["subtitle", "h6"], label: "Heading 6", value: "h6" },
  { icon: <ListIcon />, keywords: ["unordered", "ul", "-"], label: "Bulleted list", value: KEYS.ul },
  { icon: <ListOrderedIcon />, keywords: ["ordered", "ol", "1"], label: "Numbered list", value: KEYS.ol },
  { icon: <SquareIcon />, keywords: ["checklist", "task", "checkbox", "[]"], label: "To-do list", value: KEYS.listTodo },
  { icon: <ChevronRightIcon />, keywords: ["collapsible", "expandable"], label: "Toggle list", value: KEYS.toggle },
  { icon: <FileCodeIcon />, keywords: ["```"], label: "Code", value: KEYS.codeBlock },
  { icon: <Code2 />, keywords: ["code-drawing", "diagram", "plantuml", "graphviz", "flowchart", "mermaid"], label: "Code Drawing", value: KEYS.codeDrawing },
  { icon: <QuoteIcon />, keywords: ["citation", "blockquote", ">"], label: "Quote", value: KEYS.blockquote },
  { icon: <Columns3Icon />, label: "3 columns", value: "action_three_columns" },
];

const ButtonClickPanelNoteTurnInto = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const [open, setOpen] = useState(false);
  const value = useSelectionFragmentProp({
    defaultValue: KEYS.p,
    getProp: (node) => getBlockType(node as TElement),
  });
  const selectedItem = useMemo(
    () => turnIntoItems.find((item) => item.value === (value ?? KEYS.p)) ?? turnIntoItems[0],
    [value],
  );
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton className="min-w-32" pressed={open} tooltip="Turn into" isDropdown>
          {selectedItem.label}
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="ignore-click-outside/toolbar min-w-0"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          editor.tf.focus();
        }}
        align="start"
      >
        <ToolbarMenuGroup
          value={value}
          onValueChange={(type) => {
            setBlockType(editor, type);
          }}
          label="Turn into"
        >
          {turnIntoItems.map(({ icon, label, value: itemValue }) => (
            <DropdownMenuRadioItem
              key={itemValue}
              className={TURN_INTO_MENU_ITEM_CLASS_NAME}
              value={itemValue}
            >
              <span className="dropdown-menu__check-indicator">
                <DropdownMenuItemIndicator>
                  <CheckIcon />
                </DropdownMenuItemIndicator>
              </span>
              {icon}
              {label}
            </DropdownMenuRadioItem>
          ))}
        </ToolbarMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ButtonClickPanelNoteTurnInto, turnIntoItems };
