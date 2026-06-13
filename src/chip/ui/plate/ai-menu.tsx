"use client";

import * as React from "react";
import { AIChatPlugin, AIPlugin } from "@platejs/ai/react";
import { CheckIcon, CornerUpLeftIcon, Loader2Icon, PauseIcon, PenLineIcon, SendIcon, SmileIcon, WandSparklesIcon, XIcon } from "lucide-react";
import { useEditorPlugin, usePluginOption } from "platejs/react";
import { Button } from "@/chip/ui/button/button";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList } from "@/chip/ui/command";
import { cn } from "@/lib/utils";

type AIMenuItemsProps = {
  input: string;
  setInput: (value: string) => void;
  setValue: (value: string) => void;
};
type AIAction = {
  icon: React.ReactNode;
  label: string;
  value: string;
  prompt?: string;
  toolName?: "edit" | "generate" | "comment";
};

const aiActions: AIAction[] = [
  {
    icon: <WandSparklesIcon />,
    label: "Improve writing",
    prompt: "Improve the writing for clarity and flow, without changing meaning or adding new information.",
    toolName: "edit",
    value: "improveWriting",
  },
  {
    icon: <CheckIcon />,
    label: "Fix spelling and grammar",
    prompt: "Fix spelling, grammar, and punctuation errors within each block only, without changing meaning, tone, or adding new information.",
    toolName: "edit",
    value: "fixSpelling",
  },
  {
    icon: <PenLineIcon />,
    label: "Continue writing",
    prompt: "Continue writing AFTER <Block> ONLY ONE SENTENCE. DONT REPEAT THE TEXT.",
    toolName: "generate",
    value: "continueWrite",
  },
  {
    icon: <SmileIcon />,
    label: "Emojify",
    prompt: "Add a small number of contextually relevant emojis within each block only. You may insert emojis, but do not remove, replace, or rewrite existing text.",
    toolName: "edit",
    value: "emojify",
  },
];

const submitPrompt = (input: string, action: AIAction, api: ReturnType<typeof useEditorPlugin<typeof AIChatPlugin>>["api"]) => {
  void api.aiChat.submit(input, {
    prompt: action.prompt,
    toolName: action.toolName,
  });
};
const AIMenuItems = ({ input, setInput, setValue }: AIMenuItemsProps) => {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const submitInput = () => {
    if (input.trim().length === 0) return;
    void api.aiChat.submit(input);
    setInput("");
    setValue("");
  };
  return (
    <>
      <CommandGroup heading="Ask AI">
        <CommandItem value="submit" onSelect={submitInput} disabled={input.trim().length === 0}>
          <SendIcon />
          Send prompt
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Edit or generate">
        {aiActions.map((action) => (
          <CommandItem
            key={action.value}
            value={action.value}
            onSelect={() => {
              submitPrompt(input, action, api);
              setInput("");
              setValue("");
            }}
          >
            {action.icon}
            {action.label}
          </CommandItem>
        ))}
      </CommandGroup>
      <CommandGroup heading="Preview">
        <CommandItem
          value="accept"
          onSelect={() => {
            editor.getTransforms(AIChatPlugin).aiChat.accept();
          }}
        >
          <CheckIcon />
          Accept
        </CommandItem>
        <CommandItem
          value="discard"
          onSelect={() => {
            editor.getTransforms(AIPlugin).ai.undo();
            api.aiChat.hide();
          }}
        >
          <XIcon />
          Discard
        </CommandItem>
      </CommandGroup>
    </>
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
      <Command className="rounded-lg" value={value} onValueChange={setValue} shouldFilter={false}>
        <div className="flex items-center gap-2 border-b px-3 py-2 text-muted-foreground text-sm">
          {isLoading ? <Loader2Icon className="size-4 animate-spin" /> : <WandSparklesIcon className="size-4" />}
          <span>{isLoading ? "AI is working..." : "Ask AI"}</span>
          <Button size="sm" variant="ghost" className="ml-auto h-7 px-2" onClick={() => api.aiChat.hide()}>
            <XIcon className="size-4" />
          </Button>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 p-3 text-muted-foreground text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            {chat.status === "submitted" ? "Thinking..." : "Writing..."}
          </div>
        ) : (
          <CommandInput
            value={input}
            onValueChange={setInput}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                api.aiChat.hide();
              }
              if (event.key === "Enter" && !event.shiftKey && value.length === 0) {
                event.preventDefault();
                if (input.trim().length === 0) return;
                void api.aiChat.submit(input);
                setInput("");
              }
            }}
            placeholder="Ask AI anything..."
            autoFocus
          />
        )}
        {!isLoading ? (
          <CommandList>
            <AIMenuItems input={input} setInput={setInput} setValue={setValue} />
          </CommandList>
        ) : null}
        <div className="flex items-center justify-end gap-2 border-t px-2 py-1.5">
          {isLoading ? (
            <Button size="sm" variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => api.aiChat.stop()}>
              <PauseIcon className="size-4" />
              Stop
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className={cn("flex items-center gap-1 text-xs")} onClick={() => api.aiChat.hide()}>
              <CornerUpLeftIcon className="size-4" />
              Close
            </Button>
          )}
        </div>
      </Command>
    </div>
  );
};
const AILoadingBar = () => {
  const { api } = useEditorPlugin(AIChatPlugin);
  const chat = usePluginOption(AIChatPlugin, "chat");
  const isLoading = chat.status === "streaming" || chat.status === "submitted";
  if (!isLoading) return null;
  return (
    <div className="-translate-x-1/2 absolute bottom-4 left-1/2 z-50 flex items-center gap-3 rounded-md border bg-muted px-3 py-1.5 text-muted-foreground text-sm shadow-md">
      <Loader2Icon className="size-4 animate-spin" />
      <span>{chat.status === "submitted" ? "Thinking..." : "Writing..."}</span>
      <Button size="sm" variant="ghost" className="flex items-center gap-1 text-xs" onClick={() => api.aiChat.stop()}>
        <PauseIcon className="size-4" />
        Stop
      </Button>
    </div>
  );
};

export { AILoadingBar, AIMenu, AIMenuItems, aiActions };
export type { AIAction, AIMenuItemsProps };
