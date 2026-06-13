"use client";

import * as React from "react";
import { PlaceholderPlugin } from "@platejs/media/react";
import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu";
import { AudioLinesIcon, FileUpIcon, FilmIcon, ImageIcon, LinkIcon } from "lucide-react";
import { isUrl, KEYS } from "platejs";
import { useEditorRef } from "platejs/react";
import { toast } from "sonner";
import { useFilePicker } from "use-file-picker";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/chip/panel/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/chip/ui/dialog/alert-dialog";
import { Input } from "@/chip/ui/input";
import { ToolbarSplitButton, ToolbarSplitButtonPrimary, ToolbarSplitButtonSecondary } from "@/chip/ui/plate/toolbar";

type MediaConfig = {
  accept: string[];
  icon: React.ReactNode;
  title: string;
  tooltip: string;
};
type MediaUrlDialogContentProps = {
  currentConfig: MediaConfig;
  nodeType: string;
  setOpen: (value: boolean) => void;
};
type MediaToolbarButtonProps = DropdownMenuProps & {
  nodeType: string;
};

const MEDIA_CONFIG: Record<string, MediaConfig> = {
  [KEYS.audio]: { accept: ["audio/*"], icon: <AudioLinesIcon className="size-4" />, title: "Insert Audio", tooltip: "Audio" },
  [KEYS.file]: { accept: ["*"], icon: <FileUpIcon className="size-4" />, title: "Insert File", tooltip: "File" },
  [KEYS.img]: { accept: ["image/*"], icon: <ImageIcon className="size-4" />, title: "Insert Image", tooltip: "Image" },
  [KEYS.video]: { accept: ["video/*"], icon: <FilmIcon className="size-4" />, title: "Insert Video", tooltip: "Video" },
};

const MediaUrlDialogContent = ({ currentConfig, nodeType, setOpen }: MediaUrlDialogContentProps) => {
  const editor = useEditorRef();
  const [url, setUrl] = React.useState("");
  const embedMedia = React.useCallback(() => {
    if (!isUrl(url)) {
      toast.error("Invalid URL");
      return;
    }
    setOpen(false);
    editor.tf.insertNodes({
      children: [{ text: "" }],
      name: nodeType === KEYS.file ? url.split("/").pop() : undefined,
      type: nodeType,
      url,
    });
  }, [url, editor, nodeType, setOpen]);
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{currentConfig.title}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription className="group relative w-full">
        <label className="-translate-y-1/2 absolute top-1/2 block cursor-text px-1 text-muted-foreground/70 text-sm transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:font-medium group-focus-within:text-foreground group-focus-within:text-xs has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground has-[+input:not(:placeholder-shown)]:text-xs" htmlFor="url">
          <span className="inline-flex bg-background px-2">URL</span>
        </label>
        <Input
          id="url"
          className="w-full"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") embedMedia();
          }}
          placeholder=""
          type="url"
          autoFocus
        />
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={(event) => {
            event.preventDefault();
            embedMedia();
          }}
        >
          Accept
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};
const MediaToolbarButton = ({ nodeType, ...props }: MediaToolbarButtonProps) => {
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
      <AlertDialog open={dialogOpen} onOpenChange={(value) => setDialogOpen(value)}>
        <AlertDialogContent className="gap-6">
          <MediaUrlDialogContent currentConfig={currentConfig} nodeType={nodeType} setOpen={setDialogOpen} />
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export { MediaToolbarButton };
