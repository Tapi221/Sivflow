"use client";

import * as React from "react";

import { AIChatPlugin } from "@platejs/ai/react";

import { useEditorPlugin } from "platejs/react";

import type { ToolbarButtonProps } from "./toolbar";

import { ToolbarButton } from "./toolbar";



const AIToolbarButton = (props: ToolbarButtonProps) => {
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



export { AIToolbarButton };
