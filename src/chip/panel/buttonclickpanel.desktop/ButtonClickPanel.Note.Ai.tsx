"use client";

import type { MouseEvent } from "react";
import { AIChatPlugin } from "@platejs/ai/react";
import { WandSparklesIcon } from "lucide-react";
import { useEditorPlugin, usePluginOption } from "platejs/react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

const AI_TOOLBAR_BUTTON_TOOLTIP = "AI commands";

const ButtonClickPanelNoteAi = ({ onClick, onMouseDown, tooltip = AI_TOOLBAR_BUTTON_TOOLTIP, ...props }: ToolbarButtonProps) => {
  const { api } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, "open");
  return (
    <ToolbarButton
      aria-label={AI_TOOLBAR_BUTTON_TOOLTIP}
      pressed={open}
      tooltip={tooltip}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (open) {
          api.aiChat.hide();
          return;
        }
        api.aiChat.show();
      }}
      onMouseDown={(event: MouseEvent<HTMLButtonElement>) => {
        onMouseDown?.(event);
        if (event.defaultPrevented) return;
        event.preventDefault();
      }}
      {...props}
    >
      <WandSparklesIcon />
    </ToolbarButton>
  );
};

export { ButtonClickPanelNoteAi };
