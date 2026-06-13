"use client";

import * as React from "react";

import { AIChatPlugin } from "@platejs/ai/react";

import { Loader2Icon, PauseIcon, SendIcon, XIcon } from "lucide-react";

import { useEditorPlugin, usePluginOption } from "platejs/react";

import { Button } from "@/chip/ui/button/button";

import { cn } from "@/lib/utils";

type AIMenuItemsProps = {
  input: string;
  setInput: (value: string) => void;
  setValue: (value: string) => void;
};

const AIMenuItems = ({ input, setInput, setValue }: AIMenuItemsProps) => {
  const { api } = useEditorPlugin(AIChatPlugin);
  const submitInput = () => {
    if (input.trim().length === 0) return;
    void api.aiChat.submit(input);
    setInput("");
    setValue("");
  };

  return (
    <div className="flex items-center justify-end gap-2 border-t px-2 py-1.5">
      <Button size="sm" variant="ghost" onClick={() => api.aiChat.hide()}>
        <XIcon className="size-4" />
        Close
      </Button>
      <Button size="sm" onClick={submitInput}>
        <SendIcon className="size-4" />
        Send
      </Button>
    </div>
  );
};

const AIMenu = () => {
  const { api } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, "open");
  const chat = usePluginOption(AIChatPlugin, "chat");
  const [input, setInput] = React.useState("");
  const [value, setValue] = React.useState("");
  const isLoading = chat.status === "streaming" || chat.status === "submitted";

  if (!open) return null;

  return (
    <div className="absolute right-4 bottom-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-lg border bg-popover text-popover-foreground shadow-md">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-muted-foreground text-sm">
        {isLoading && <Loader2Icon className="size-4 animate-spin" />}
        <span>{isLoading ? "AI is working..." : "Ask AI"}</span>
      </div>
      <textarea
        className="min-h-24 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            api.aiChat.hide();
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (input.trim().length === 0) return;
            void api.aiChat.submit(input);
            setInput("");
            setValue("");
          }
        }}
        placeholder="Ask AI anything..."
        autoFocus
      />
      <AIMenuItems input={input} setInput={setInput} setValue={setValue} />
      <input type="hidden" value={value} readOnly />
    </div>
  );
};

const AILoadingBar = () => {
  const { api } = useEditorPlugin(AIChatPlugin);
  const chat = usePluginOption(AIChatPlugin, "chat");
  const isLoading = chat.status === "streaming" || chat.status === "submitted";

  if (!isLoading) return null;

  return (
    <div
      className={cn(
        "-translate-x-1/2 absolute bottom-4 left-1/2 z-50 flex items-center gap-3 rounded-md border bg-muted px-3 py-1.5 text-muted-foreground text-sm shadow-md",
      )}
    >
      <Loader2Icon className="size-4 animate-spin" />
      <span>{chat.status === "submitted" ? "Thinking..." : "Writing..."}</span>
      <Button size="sm" variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => api.aiChat.stop()}>
        <PauseIcon className="size-4" />
        Stop
      </Button>
    </div>
  );
};

export { AILoadingBar, AIMenu, AIMenuItems };

export type { AIMenuItemsProps };
