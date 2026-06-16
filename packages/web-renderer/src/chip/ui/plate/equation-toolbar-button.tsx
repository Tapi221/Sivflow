"use client";

import { insertInlineEquation } from "@platejs/math";

import type { ToolbarButtonProps } from "./toolbar";

import { ToolbarButton } from "./toolbar";

import { RadicalIcon } from "lucide-react";

import { useEditorRef } from "platejs/react";



const InlineEquationToolbarButton = (props: ToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={() => {
        insertInlineEquation(editor);
      }}
      tooltip="Mark as equation"
    >
      <RadicalIcon />
    </ToolbarButton>
  );
};



export { InlineEquationToolbarButton };
