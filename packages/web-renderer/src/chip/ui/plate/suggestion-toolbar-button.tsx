"use client";

import { SuggestionPlugin } from "@platejs/suggestion/react";
import type { ToolbarButtonProps } from "@web-renderer/chip/ui/plate/toolbar";
import { ToolbarButton } from "@web-renderer/chip/ui/plate/toolbar";
import { cn } from "@web-renderer/lib/utils";
import { PencilLineIcon } from "lucide-react";
import { useEditorPlugin, usePluginOption } from "platejs/react";

const SuggestionToolbarButton = (props: ToolbarButtonProps) => {
  const { setOption } = useEditorPlugin(SuggestionPlugin);
  const isSuggesting = usePluginOption(SuggestionPlugin, "isSuggesting");
  return (
    <ToolbarButton
      {...props}
      className={cn(isSuggesting && "text-foreground", props.className)}
      onClick={() => setOption("isSuggesting", !isSuggesting)}
      onMouseDown={(event) => event.preventDefault()}
      tooltip={isSuggesting ? "Turn off suggesting" : "Suggestion edits"}
    >
      <PencilLineIcon />
    </ToolbarButton>
  );
};

export { SuggestionToolbarButton };
