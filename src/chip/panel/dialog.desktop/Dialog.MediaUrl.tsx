import { useCallback, useState } from "react";
import { isUrl, KEYS } from "platejs";
import { useEditorRef } from "platejs/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/chip/panel/dialog.desktop/dialog/alert-dialog";
import { Input } from "@/chip/ui/input";

type MediaConfig = {
  accept: string[];
  icon: ReactNode;
  title: string;
  tooltip: string;
};
interface MediaUrlDialogProps {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  currentConfig: MediaConfig;
  nodeType: string;
}
interface MediaUrlDialogContentProps {
  currentConfig: MediaConfig;
  nodeType: string;
  setOpen: (value: boolean) => void;
}

const MediaUrlDialogContent = ({ currentConfig, nodeType, setOpen }: MediaUrlDialogContentProps) => {
  const editor = useEditorRef();
  const [url, setUrl] = useState("");
  const embedMedia = useCallback(() => {
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
  }, [editor, nodeType, setOpen, url]);
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{currentConfig.title}</AlertDialogTitle>
      </AlertDialogHeader>
      <AlertDialogDescription className="group relative w-full">
        <label className="absolute top-1/2 block -translate-y-1/2 cursor-text px-1 text-sm text-muted-foreground/70 transition-all group-focus-within:pointer-events-none group-focus-within:top-0 group-focus-within:cursor-default group-focus-within:text-xs group-focus-within:font-medium group-focus-within:text-foreground has-[+input:not(:placeholder-shown)]:pointer-events-none has-[+input:not(:placeholder-shown)]:top-0 has-[+input:not(:placeholder-shown)]:cursor-default has-[+input:not(:placeholder-shown)]:text-xs has-[+input:not(:placeholder-shown)]:font-medium has-[+input:not(:placeholder-shown)]:text-foreground" htmlFor="url">
          <span className="inline-flex bg-background px-2">URL</span>
        </label>
        <Input id="url" className="w-full" value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter") embedMedia();
        }} placeholder="" type="url" autoFocus
        />
      </AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={(event) => {
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
const MediaUrlDialog = ({ open, onOpenChange, currentConfig, nodeType }: MediaUrlDialogProps) => {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-6">
        <MediaUrlDialogContent currentConfig={currentConfig} nodeType={nodeType} setOpen={onOpenChange} />
      </AlertDialogContent>
    </AlertDialog>
  );
};

export { MediaUrlDialog };
export type { MediaConfig, MediaUrlDialogProps };
