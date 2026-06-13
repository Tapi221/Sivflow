"use client";

import { insertInlineEquation } from "@platejs/math";
import { RadicalIcon } from "lucide-react";
import { useEditorRef } from "platejs/react";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";

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
