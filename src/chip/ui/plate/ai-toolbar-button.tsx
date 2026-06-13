"use client";

import * as React from "react";
import { AIChatPlugin } from "@platejs/ai/react";
import { useEditorPlugin } from "platejs/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

const AiToolbarButton = (props: ToolbarButtonProps) => {
  const { api } = useEditorPlugin(AIChatPlugin);
  return (
    <ToolbarButton
      {...props}
      onClick={() => {
        api.aiChat.show();
      }}
      onMouseDown={(event) => {
        event.preventDefault();
      }}
    />
  );
};

export { AiToolbarButton };
