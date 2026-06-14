"use client";

import * as React from "react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { AudioLines, CalendarIcon, ChevronRightIcon, Code2, Columns3Icon, FileCodeIcon, FileUp, FilmIcon, Heading1Icon, Heading2Icon, Heading3Icon, ImageIcon, Link2Icon, ListIcon, ListOrderedIcon, MinusIcon, PenToolIcon, PilcrowIcon, PlusIcon, QuoteIcon, RadicalIcon, SquareIcon, SuperscriptIcon, TableIcon, TableOfContentsIcon } from "lucide-react";
import { KEYS } from "platejs";
import type { PlateEditor } from "platejs/react";
import { useEditorRef } from "platejs/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { insertBlock, insertInlineElement } from "@/components/editor/transforms";
import { ToolbarButton, ToolbarMenuGroup } from "./toolbar";

type InsertToolbarItem = {
  focusEditor?: boolean;
  icon: React.ReactNode;
  label: string;
  onSelect: (editor: PlateEditor, value: string) => void;
  value: string;
};
type InsertToolbarGroup = {
  group: string;
  items: InsertToolbarItem[];
};

const createBlockItems = (items: Omit<InsertToolbarItem, "onSelect">[]): InsertToolbarItem[] => items.map((item) => ({
  ...item,
  onSelect: (editor, value) => {
    insertBlock(editor, value);
  },
}));
const createInlineItems = (items: Omit<InsertToolbarItem, "onSelect">[]): InsertToolbarItem[] => items.map((item) => ({
  ...item,
  onSelect: (editor, value) => {
    insertInlineElement(editor, value);
  },
}));

const groups: InsertToolbarGroup[] = [
  {
    group: "Basic blocks",
    items: createBlockItems([
      { icon: <PilcrowIcon />, label: "Paragraph", value: KEYS.p },
      { icon: <Heading1Icon />, label: "Heading 1", value: "h1" },
      { icon: <Heading2Icon />, label: "Heading 2", value: "h2" },
      { icon: <Heading3Icon />, label: "Heading 3", value: "h3" },
      { icon: <TableIcon />, label: "Table", value: KEYS.table },
      { icon: <FileCodeIcon />, label: "Code", value: KEYS.codeBlock },
      { icon: <QuoteIcon />, label: "Quote", value: KEYS.blockquote },
      { icon: <MinusIcon />, label: "Divider", value: KEYS.hr },
    ]),
  },
  {
    group: "Lists",
    items: createBlockItems([
      { icon: <ListIcon />, label: "Bulleted list", value: KEYS.ul },
      { icon: <ListOrderedIcon />, label: "Numbered list", value: KEYS.ol },
      { icon: <SquareIcon />, label: "To-do list", value: KEYS.listTodo },
      { icon: <ChevronRightIcon />, label: "Toggle list", value: KEYS.toggle },
    ]),
  },
  {
    group: "Media",
    items: createBlockItems([
      { icon: <ImageIcon />, label: "Image", value: KEYS.img },
      { icon: <FilmIcon />, label: "Video", value: KEYS.video },
      { icon: <AudioLines />, label: "Audio", value: KEYS.audio },
      { icon: <FileUp />, label: "File", value: KEYS.file },
      { icon: <Link2Icon />, label: "Embed", value: KEYS.mediaEmbed },
    ]),
  },
  {
    group: "Advanced blocks",
    items: createBlockItems([
      { icon: <TableOfContentsIcon />, label: "Table of contents", value: KEYS.toc },
      { icon: <Columns3Icon />, label: "3 columns", value: "action_three_columns" },
      { focusEditor: false, icon: <RadicalIcon />, label: "Equation", value: KEYS.equation },
      { icon: <PenToolIcon />, label: "Excalidraw", value: KEYS.excalidraw },
      { icon: <Code2 />, label: "Code Drawing", value: KEYS.codeDrawing },
    ]),
  },
  {
    group: "Inline",
    items: createInlineItems([
      { icon: <Link2Icon />, label: "Link", value: KEYS.link },
      { focusEditor: true, icon: <CalendarIcon />, label: "Date", value: KEYS.date },
      { focusEditor: true, icon: <SuperscriptIcon />, label: "Footnote", value: "action_footnote" },
      { focusEditor: false, icon: <RadicalIcon />, label: "Inline Equation", value: KEYS.inlineEquation },
    ]),
  },
];

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
      <DropdownMenuContent className="flex max-h-96 min-w-0 flex-col overflow-y-auto" align="start">
        {groups.map(({ group, items }) => (
          <ToolbarMenuGroup key={group} label={group}>
            {items.map(({ icon, label, onSelect, value }) => (
              <DropdownMenuItem
                key={value}
                className="min-w-44"
                onSelect={() => {
                  onSelect(editor, value);
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
