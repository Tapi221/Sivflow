"use client";

import * as React from "react";

import { PlaceholderPlugin } from "@platejs/media/react";

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";

import { AudioLinesIcon, FileUpIcon, FilmIcon, ImageIcon, LinkIcon } from "lucide-react";

import { KEYS } from "platejs";

import { useEditorRef } from "platejs/react";

import { useFilePicker } from "use-file-picker";

import type { MediaConfig } from "@/chip/panel/dialog.desktop/Dialog.MediaUrl";

import { MediaUrlDialog } from "@/chip/panel/dialog.desktop/Dialog.MediaUrl";

import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";

import { ToolbarSplitButton, ToolbarSplitButtonPrimary, ToolbarSplitButtonSecondary } from "@/chip/ui/plate/toolbar";



type MediaToolbarButtonProps = DropdownMenuProps & {
  nodeType: string;
};



const MEDIA_CONFIG: Record<string, MediaConfig> = {
  [KEYS.audio]: { accept: ["audio/*"], icon: <AudioLinesIcon className="size-4" />, title: "Insert Audio", tooltip: "Audio" },
  [KEYS.file]: { accept: ["*"], icon: <FileUpIcon className="size-4" />, title: "Insert File", tooltip: "File" },
  [KEYS.img]: { accept: ["image/*"], icon: <ImageIcon className="size-4" />, title: "Insert Image", tooltip: "Image" },
  [KEYS.video]: { accept: ["video/*"], icon: <FilmIcon className="size-4" />, title: "Insert Video", tooltip: "Video" },
};



const ButtonNoteMedia = ({ nodeType, ...props }: MediaToolbarButtonProps) => {
  const currentConfig = MEDIA_CONFIG[nodeType];
  const editor = useEditorRef();
  const [open, setOpen] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { openFilePicker } = useFilePicker({
    accept: currentConfig.accept,
    multiple: true,
    onFilesSelected: ({ plainFiles: updatedFiles }) => {
      editor.getTransforms(PlaceholderPlugin).insert.media(updatedFiles);
    },
  });
  return (
    <>
      <ToolbarSplitButton
        onClick={() => {
          openFilePicker();
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }}
        pressed={open}
      >
        <ToolbarSplitButtonPrimary>{currentConfig.icon}</ToolbarSplitButtonPrimary>
        <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
          <DropdownMenuTrigger asChild>
            <ToolbarSplitButtonSecondary />
          </DropdownMenuTrigger>
          <DropdownMenuContent onClick={(event) => event.stopPropagation()} align="start" alignOffset={-32}>
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => openFilePicker()}>
                {currentConfig.icon}
                Upload from computer
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
                <LinkIcon />
                Insert via URL
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ToolbarSplitButton>
      <MediaUrlDialog open={dialogOpen} onOpenChange={setDialogOpen} currentConfig={currentConfig} nodeType={nodeType} />
    </>
  );
};



export { ButtonNoteMedia };



export type { MediaToolbarButtonProps };
