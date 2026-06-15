import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import type * as React from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";



type MediaUploadToastProps = React.ComponentPropsWithoutRef<"div"> & {
  id?: string | number;
  name?: string;
  progress?: number;
  status?: "error" | "loading" | "success";
};



const getProgress = (progress: MediaUploadToastProps["progress"]) => Math.max(0, Math.min(100, progress ?? 0));



const MediaUploadToast = ({ id, name, progress, status = "loading", ...props }: MediaUploadToastProps) => {
  const resolvedProgress = getProgress(progress);
  return (
    <div {...props} className={cn("flex min-w-72 items-center gap-3 rounded-md border bg-background p-3 shadow-md", props.className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        {status === "loading" && <Loader2Icon className="size-4 animate-spin" />}
        {status === "success" && <CheckCircleIcon className="size-4" />}
        {status === "error" && <XCircleIcon className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full bg-foreground transition-all", status === "error" && "bg-destructive")}
            style={{ width: `${resolvedProgress}%` }}
          />
        </div>
      </div>
      <button
        className="text-sm text-muted-foreground hover:text-foreground"
        type="button"
        onClick={() => {
          if (id !== null && id !== undefined) {
            toast.dismiss(id);
          }
        }}
      >
        Close
      </button>
    </div>
  );
};



export { MediaUploadToast };



export type { MediaUploadToastProps };
