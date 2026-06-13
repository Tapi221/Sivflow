"use client";

import * as React from "react";
import { MarkdownPlugin } from "@platejs/markdown";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { ArrowUpToLineIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import { getEditorDOMFromHtmlString } from "platejs/static";
import { useFilePicker } from "use-file-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

type ImportType = "html" | "markdown";

const ImportToolbarButton = (props: DropdownMenuProps) => {
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const getFileNodes = (text: string, type: ImportType) => {
    if (type === "html") {
      const editorNode = getEditorDOMFromHtmlString(text);
      return editor.api.html.deserialize({ element: editorNode });
    }
    if (type === "markdown") return editor.getApi(MarkdownPlugin).markdown.deserialize(text);
    return [];
  };
  const { openFilePicker: openMdFilePicker } = useFilePicker({
    accept: [".md", ".mdx"],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text();
      editor.tf.insertNodes(getFileNodes(text, "markdown"));
    },
  });
  const { openFilePicker: openHtmlFilePicker } = useFilePicker({
    accept: ["text/html"],
    multiple: false,
    onFilesSelected: async ({ plainFiles }) => {
      const text = await plainFiles[0].text();
      editor.tf.insertNodes(getFileNodes(text, "html"));
    },
  });
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
      <DropdownMenuTrigger asChild>
        <ToolbarButton pressed={open} tooltip="Import" isDropdown>
          <ArrowUpToLineIcon className="size-4" />
        </ToolbarButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => openHtmlFilePicker()}>Import from HTML</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openMdFilePicker()}>Import from Markdown</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ImportToolbarButton };
