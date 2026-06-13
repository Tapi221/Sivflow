"use client";

import * as React from "react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { ChevronRightIcon, FileCodeIcon, Heading1Icon, Heading2Icon, Heading3Icon, ListIcon, ListOrderedIcon, PilcrowIcon, PlusIcon, QuoteIcon, SquareIcon, TableIcon } from "lucide-react";
import { KEYS } from "platejs";
import type { PlateEditor } from "platejs/react";
import { useEditorRef } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { ToolbarButton, ToolbarMenuGroup } from "@/chip/ui/plate/toolbar";
import { insertBlock } from "@/components/editor/transforms";

type InsertToolbarItem = {
  icon: React.ReactNode;
  label: string;
  value: string;
};
type InsertToolbarGroup = {
  group: string;
  items: InsertToolbarItem[];
};

const groups: InsertToolbarGroup[] = [
  {
    group: "Basic blocks",
    items: [
      { icon: <PilcrowIcon />, label: "Paragraph", value: KEYS.p },
      { icon: <Heading1Icon />, label: "Heading 1", value: "h1" },
      { icon: <Heading2Icon />, label: "Heading 2", value: "h2" },
      { icon: <Heading3Icon />, label: "Heading 3", value: "h3" },
      { icon: <TableIcon />, label: "Table", value: KEYS.table },
      { icon: <FileCodeIcon />, label: "Code", value: KEYS.codeBlock },
      { icon: <QuoteIcon />, label: "Quote", value: KEYS.blockquote },
    ],
  },
  {
    group: "Lists",
    items: [
      { icon: <ListIcon />, label: "Bulleted list", value: KEYS.ulClassic },
      { icon: <ListOrderedIcon />, label: "Numbered list", value: KEYS.olClassic },
      { icon: <SquareIcon />, label: "To-do list", value: KEYS.taskList },
      { icon: <ChevronRightIcon />, label: "Toggle list", value: KEYS.toggle },
    ],
  },
];

const insertClassicBlock = (editor: PlateEditor, type: string) => {
  insertBlock(editor, type);
};

const InsertToolbarButton = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Insert" isDropdown>
          <PlusIcon />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="flex max-h-[500px] min-w-0 flex-col overflow-y-auto" align="start">
        {groups.map(({ group, items }) => (
          <ToolbarMenuGroup key={group} label={group}>
            {items.map(({ icon, label, value }) => (
              <DropdownMenuItem
                key={value}
                className="min-w-[180px]"
                onSelect={() => {
                  insertClassicBlock(editor, value);
                  editor.tf.focus();
                }}
              >
                {icon}
                {label}
              </DropdownMenuItem>
            ))}
          </ToolbarMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { InsertToolbarButton };
export type { InsertToolbarGroup, InsertToolbarItem };
