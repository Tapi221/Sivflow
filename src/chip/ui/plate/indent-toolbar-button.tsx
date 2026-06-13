import { useEditorRef } from "platejs/react";
import { ToolbarButton } from "@/chip/ui/plate/toolbar";
import type { ToolbarButtonProps } from "@/chip/ui/plate/toolbar";

type IndentToolbarButtonProps = ToolbarButtonProps & {
  reverse?: boolean;
};

const IndentToolbarButton = ({ reverse, onClick, ...props }: IndentToolbarButtonProps) => {
  const editor = useEditorRef();
  return (
    <ToolbarButton
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (reverse) {
          editor.tf.outdent();
          return;
        }
        editor.tf.indent();
      }}
    />
  );
};

export { IndentToolbarButton };
export type { IndentToolbarButtonProps };
