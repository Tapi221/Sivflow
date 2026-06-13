"use client";

import { IndentIcon, ListIcon, ListOrderedIcon, OutdentIcon } from "lucide-react";

import { KEYS } from "platejs";

import { useEditorRef } from "platejs/react";

import type { ToolbarButtonProps } from "./toolbar";

import { ToolbarButton } from "./toolbar";



type ListToolbarButtonProps = ToolbarButtonProps & {
  nodeType: string;
};

type IndentToolbarButtonProps = ToolbarButtonProps & {
  reverse?: boolean;
};



const ListToolbarButton = ({ nodeType, ...props }: ListToolbarButtonProps) => {
  const editor = useEditorRef();
  const icon = nodeType === KEYS.olClassic ? <ListOrderedIcon /> : <ListIcon />;
  return (
    <ToolbarButton
      {...props}
      tooltip={nodeType === KEYS.olClassic ? "Numbered list" : "Bulleted list"}
      onClick={() => {
        editor.tf.toggleBlock(nodeType);
        editor.tf.focus();
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {props.children ?? icon}
    </ToolbarButton>
  );
};

const IndentToolbarButton = ({ reverse = false, ...props }: IndentToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      tooltip={reverse ? "Outdent" : "Indent"}
      onClick={() => {
        if (reverse) {
          editor.tf.outdent();
        } else {
          editor.tf.indent();
        }
        editor.tf.focus();
      }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {props.children ?? (reverse ? <OutdentIcon /> : <IndentIcon />)}
    </ToolbarButton>
  );
};

const TodoListToolbarButton = (props: ToolbarButtonProps) => {
  return <ListToolbarButton {...props} nodeType={KEYS.taskList} />;
};



export { IndentToolbarButton, ListToolbarButton, TodoListToolbarButton };



export type { IndentToolbarButtonProps, ListToolbarButtonProps };
