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
type IndentTransforms = {
  indent: () => void;
  outdent: () => void;
};

const getIndentTransforms = (editor: ReturnType<typeof useEditorRef>) => {
  return editor.tf as typeof editor.tf & IndentTransforms;
};
const runIndentCommand = (editor: ReturnType<typeof useEditorRef>, reverse: boolean) => {
  const indentTransforms = getIndentTransforms(editor);
  if (reverse) {
    indentTransforms.outdent();
    editor.tf.focus();
    return;
  }
  indentTransforms.indent();
  editor.tf.focus();
};

const ListToolbarButton = ({ nodeType, ...props }: ListToolbarButtonProps) => {
  const editor = useEditorRef();
  const isOrdered = nodeType === KEYS.ol;
  return (
    <ToolbarButton
      {...props}
      tooltip={isOrdered ? "Numbered list" : "Bulleted list"}
      onClick={() => {
        editor.tf.toggleBlock(nodeType);
        editor.tf.focus();
      }}
    >
      {props.children ?? (isOrdered ? <ListOrderedIcon /> : <ListIcon />)}
    </ToolbarButton>
  );
};
const IndentToolbarButton = ({ reverse = false, ...props }: IndentToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      tooltip={reverse ? "Outdent" : "Indent"}
      onClick={() => runIndentCommand(editor, reverse)}
    >
      {props.children ?? (reverse ? <OutdentIcon /> : <IndentIcon />)}
    </ToolbarButton>
  );
};
const TodoListToolbarButton = (props: ToolbarButtonProps) => {
  return <ListToolbarButton {...props} nodeType={KEYS.listTodo} />;
};

export { IndentToolbarButton, ListToolbarButton, TodoListToolbarButton };
export type { IndentToolbarButtonProps, ListToolbarButtonProps };
