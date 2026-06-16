"use client";

import * as React from "react";

import { ToolbarButton } from "./toolbar";

import { Redo2Icon, Undo2Icon } from "lucide-react";

import { useEditorRef, useEditorSelector } from "platejs/react";



const RedoToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.redos.length === 0,
    [],
  );
  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.redo()}
      onMouseDown={(event) => event.preventDefault()}
      tooltip="Redo"
    >
      <Redo2Icon />
    </ToolbarButton>
  );
};

const UndoToolbarButton = (props: React.ComponentProps<typeof ToolbarButton>) => {
  const editor = useEditorRef();
  const disabled = useEditorSelector(
    (editor) => editor.history.undos.length === 0,
    [],
  );
  return (
    <ToolbarButton
      {...props}
      disabled={disabled}
      onClick={() => editor.undo()}
      onMouseDown={(event) => event.preventDefault()}
      tooltip="Undo"
    >
      <Undo2Icon />
    </ToolbarButton>
  );
};



export { RedoToolbarButton, UndoToolbarButton };
