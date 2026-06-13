"use client";

import { SuggestionPlugin } from "@platejs/suggestion/react";

import { PencilLineIcon } from "lucide-react";

import { useEditorPlugin, usePluginOption } from "platejs/react";

import { cn } from "@/lib/utils";

import type { ToolbarButtonProps } from "./toolbar";

import { ToolbarButton } from "./toolbar";

const SuggestionToolbarButton = (props: ToolbarButtonProps) => {
  const { setOption } = useEditorPlugin(SuggestionPlugin);
  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");
  return (
    <ToolbarButton
      {...props}
      className={cn(isSuggesting && "text-brand/80 hover:text-brand/80", props.className)}
      onClick={() => setOption("isSuggesting", !isSuggesting)}
      onMouseDown={(event) => event.preventDefault()}
      tooltip={isSuggesting ? "Turn off suggesting" : "Suggestion edits"}
    >
      <PencilLineIcon />
    </ToolbarButton>
  );
};

export { SuggestionToolbarButton };
